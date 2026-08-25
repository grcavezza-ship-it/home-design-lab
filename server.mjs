/**
 * server.mjs — Home Design Lab
 * Backend unico Node.js/Express. Nessun Flask.
 * Supabase per auth, DB e storage.
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CONFIG from './config.js';
import apiRouter from './routes/api.mjs';
import { legacyAccountGuard } from './middleware/legacy-account-guard.mjs';
import { authenticate } from './middleware/auth.mjs';

let genAI = null;

const app = express();
const port = CONFIG.APP.PORT;
const templatesDir = join(__dirname, 'templates');

app.use((req, res, next) => {
  if (req.hostname === 'home-design-lab.onrender.com') {
    return res.redirect(301, 'https://www.homedesignlab.it' + req.originalUrl);
  }
  next();
});

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/assets', express.static(join(__dirname, 'assets')));
app.use('/lib', express.static(join(__dirname, 'lib')));
app.use(express.static(join(__dirname), {
    extensions: ['html'],
    index: ['index.html', 'home-design-lab.html']
}));

const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
let cachedGoogleToken = { token: null, expiresAt: 0, bufferTime: 5 * 60 * 1000 };

async function getGoogleAccessTokenPublic() {
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY non configurata');
    const now = Date.now();
    if (cachedGoogleToken.token && now < (cachedGoogleToken.expiresAt - cachedGoogleToken.bufferTime)) return cachedGoogleToken.token;
    let key;
    let privateKey;
    try {
        let keyString = GOOGLE_SERVICE_ACCOUNT_KEY.trim();
        keyString = keyString.replace(/\r\n/g, '\\\\n').replace(/\n/g, '\\\\n');
        keyString = keyString.replace(/\\\\n/g, '\n');
        keyString = keyString.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        key = JSON.parse(keyString);
        if (!key.private_key) throw new Error('Chiave privata mancante nel Service Account');
        privateKey = key.private_key;
        if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
        privateKey = privateKey.replace(/\r/g, '\n');
    } catch (parseError) {
        throw new Error(`Errore parsing Service Account key: ${parseError.message}`);
    }
    const crypto = await import('crypto');
    const nowSeconds = Math.floor(now / 1000);
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const jwtClaim = Buffer.from(JSON.stringify({ iss:key.client_email, sub:key.client_email, scope:'https://www.googleapis.com/auth/drive.readonly', aud:'https://oauth2.googleapis.com/token', iat:nowSeconds, exp:nowSeconds+3600 })).toString('base64url');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${jwtHeader}.${jwtClaim}`);
    const signature = sign.sign(privateKey, 'base64url');
    const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;
    const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`});
    const data = await response.json();
    if (!response.ok) throw new Error(`Token error: ${data.error_description || data.error}`);
    cachedGoogleToken.token=data.access_token;
    cachedGoogleToken.expiresAt=now+(data.expires_in*1000);
    return data.access_token;
}

app.get('/api/drive/test-connection', async (req,res)=>{try{if(!DRIVE_ROOT_FOLDER_ID)return res.status(500).json({success:false,error:'GOOGLE_DRIVE_ROOT_FOLDER_ID non configurata',folderId:null});if(!GOOGLE_SERVICE_ACCOUNT_KEY)return res.status(500).json({success:false,error:'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'});const accessToken=await getGoogleAccessTokenPublic();const driveResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)&orderBy=name`,{headers:{Authorization:`Bearer ${accessToken}`}});if(!driveResponse.ok){const error=await driveResponse.json();throw new Error(`Google Drive API error: ${error.error?.message||JSON.stringify(error)}`)}const{files:folders}=await driveResponse.json();res.json({success:true,message:`Connessione Drive riuscita - ${folders?.length||0} sottocartelle trovate`,rootFolderId:DRIVE_ROOT_FOLDER_ID,foldersFound:folders?.length||0,folders:folders?.map(f=>({id:f.id,name:f.name,createdTime:f.createdTime,url:`https://drive.google.com/drive/folders/${f.id}`}))||[]})}catch(e){res.status(500).json({success:false,error:e.message})}});

app.get('/api/drive/sync-folders', async (req,res)=>{try{if(!DRIVE_ROOT_FOLDER_ID)return res.status(500).json({success:false,error:'GOOGLE_DRIVE_ROOT_FOLDER_ID non configurata'});if(!GOOGLE_SERVICE_ACCOUNT_KEY)return res.status(500).json({success:false,error:'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'});const accessToken=await getGoogleAccessTokenPublic();const driveResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q='${DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name,createdTime,modifiedTime)&orderBy=name`,{headers:{Authorization:`Bearer ${accessToken}`}});if(!driveResponse.ok){const error=await driveResponse.json();throw new Error(`Google Drive API error: ${error.error?.message||JSON.stringify(error)}`)}const{files:folders}=await driveResponse.json();if(!folders||!folders.length)return res.json({success:true,message:'Nessuna cartella trovata in Drive',created:0,existing:0,folders:[]});let supabaseKey=(process.env.SUPABASE_SERVICE_ROLE_KEY||CONFIG.SUPABASE.ANON_KEY)?.trim();if(!supabaseKey)throw new Error('Nessuna chiave Supabase configurata!');const supabase=createClient(CONFIG.SUPABASE.URL,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},db:{schema:'public'}});const results={created:[],existing:[],errors:[]};for(const folder of folders){try{const{data:existing,error:searchError}=await supabase.from('projects').select('id,titolo,drive_folder_id,status').eq('drive_folder_id',folder.id).maybeSingle();if(searchError)throw searchError;if(existing)results.existing.push({driveFolderId:folder.id,driveName:folder.name,projectId:existing.id,projectTitle:existing.titolo,status:existing.status});else{const projectData={drive_folder_id:folder.id,titolo:folder.name,description:`Progetto importato da Google Drive - Cartella: ${folder.name}`,drive_folder_url:`https://drive.google.com/drive/folders/${folder.id}`,status:'attivo',updated_at:new Date().toISOString()};const{data:upsertedProject,error:upsertError}=await supabase.from('projects').upsert([projectData],{onConflict:'drive_folder_id',ignoreDuplicates:false}).select().single();if(upsertError)throw upsertError;results.created.push({driveFolderId:folder.id,driveName:folder.name,projectId:upsertedProject.id,projectTitle:upsertedProject.titolo,status:upsertedProject.status,action:'created'})}}catch(folderError){results.errors.push({driveFolderId:folder.id,driveName:folder.name,error:folderError.message})}}res.json({success:true,message:`Sincronizzazione completata: ${results.created.length} nuovi, ${results.existing.length} esistenti, ${results.errors.length} errori`,summary:{totalFolders:folders.length,created:results.created.length,existing:results.existing.length,errors:results.errors.length},created:results.created,existing:results.existing,errors:results.errors})}catch(e){res.status(500).json({success:false,error:e.message})}});

app.get('/api/drive/files/:folderId',async(req,res)=>{try{const{folderId}=req.params;if(!GOOGLE_SERVICE_ACCOUNT_KEY)return res.status(500).json({success:false,error:'GOOGLE_SERVICE_ACCOUNT_KEY non configurata'});const accessToken=await getGoogleAccessTokenPublic();const driveResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink)&orderBy=modifiedTime desc`,{headers:{Authorization:`Bearer ${accessToken}`}});if(!driveResponse.ok){const error=await driveResponse.json();throw new Error(`Google Drive API error: ${error.error?.message||JSON.stringify(error)}`)}const{files}=await driveResponse.json();const getFileIcon=(mimeType)=>{if(mimeType?.includes('folder'))return'folder';if(mimeType?.includes('image'))return'image';if(mimeType?.includes('pdf'))return'picture_as_pdf';if(mimeType?.includes('document')||mimeType?.includes('word'))return'description';if(mimeType?.includes('spreadsheet')||mimeType?.includes('excel'))return'table_chart';if(mimeType?.includes('presentation')||mimeType?.includes('powerpoint'))return'slideshow';if(mimeType?.includes('video'))return'videocam';if(mimeType?.includes('audio'))return'audiotrack';return'insert_drive_file'};const formattedFiles=files?.map(file=>({id:file.id,name:file.name,mimeType:file.mimeType,size:file.size,modifiedTime:file.modifiedTime,webViewLink:file.webViewLink,webContentLink:file.webContentLink,thumbnailLink:file.thumbnailLink,icon:getFileIcon(file.mimeType),downloadUrl:file.webContentLink}))||[];res.json({success:true,files:formattedFiles,count:formattedFiles.length})}catch(e){res.status(500).json({success:false,error:e.message})}});

app.post('/api/ai/generate-tasks',async(req,res)=>{try{const{descrizione}=req.body;if(!descrizione)return res.status(400).json({success:false,error:'Descrizione mancante'});const apiKey=(process.env.GEMINI_API_KEY||'').trim();if(!apiKey)return res.status(503).json({success:false,error:'Servizio AI non configurato'});if(!genAI)genAI=new GoogleGenerativeAI(apiKey);const modelsRes=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);const modelsData=await modelsRes.json();if(!modelsData.models)throw new Error('Errore API Google: '+JSON.stringify(modelsData));const validModels=modelsData.models.filter(m=>m.supportedGenerationMethods?.includes('generateContent'));let selectedModel=validModels.find(m=>m.name.includes('gemini-1.5-flash'))?.name||validModels.find(m=>m.name.includes('gemini-1.5-pro'))?.name||validModels[0].name;selectedModel=selectedModel.replace('models/','');const model=genAI.getGenerativeModel({model:selectedModel});const prompt=`Il cliente richiede: ${descrizione}. Suddividi il lavoro in task pratici per lo studio di architettura. Usa ESCLUSIVAMENTE queste fasi: 'Rilievi e Sopralluoghi', 'Progettazione', 'Pratiche Edilizie', 'Sicurezza e Cantiere', 'Direzione Artistica'. Rispondi SOLO con un array JSON puro strutturato così: [{"titolo":"nome","fase_lavorativa":"fase"}]. Non usare formattazione markdown.`;const result=await model.generateContent(prompt);let textResponse=result.response.text();if(textResponse.includes('```'))textResponse=textResponse.replace(/```json/g,'').replace(/```/g,'').trim();res.json({success:true,tasks:JSON.parse(textResponse)})}catch(error){res.status(500).json({success:false,error:error.message})}});

// Legacy admin/account routes remain protected.
app.use('/api', legacyAccountGuard);

// Securely resend the first-access/recovery email from the portal itself.
app.post('/api/reinvia-invito', authenticate, async (req,res)=>{
    try{
        const entity=String(req.body?.entity||'').trim().toLowerCase();
        const email=String(req.body?.email||'').trim().toLowerCase();
        if(!['operator','client'].includes(entity))return res.status(400).json({error:'Tipo account non valido'});
        if(!email||!email.includes('@'))return res.status(400).json({error:'Email non valida'});
        if(entity==='operator' && req.user.role!=='admin')return res.status(403).json({error:'Solo un Admin può reinviare l’accesso ai collaboratori'});
        if(entity==='client' && !['admin','segretaria'].includes(req.user.role))return res.status(403).json({error:'Permesso insufficiente'});
        const admin=createClient(CONFIG.SUPABASE.URL,CONFIG.SUPABASE.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
        const anon=createClient(CONFIG.SUPABASE.URL,CONFIG.SUPABASE.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
        const table=entity==='operator'?'operatori_profiles':'clienti_profiles';
        const {data:profile,error:profileError}=await admin.from(table).select('*').eq('email',email).maybeSingle();
        if(profileError)throw profileError;
        if(!profile)return res.status(404).json({error:'Profilo non trovato'});
        if(entity==='operator' && profile.accesso_attivo===false)return res.status(403).json({error:'Il collaboratore è sospeso. Riattiva l’accesso prima di inviare l’invito.'});
        let userId=profile.user_id||null;
        if(!userId){
            const {data:created,error:createError}=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{nome:profile.nome||null,cognome:profile.cognome||null,portal_role:entity==='operator'?(profile.ruolo_portale||'collaboratore'):'client'}});
            if(createError && !/already|registered|duplicate/i.test(createError.message||''))throw createError;
            userId=created?.user?.id||null;
            if(userId)await admin.from(table).update({user_id:userId}).eq('id',profile.id);
        }
        const redirectTo=entity==='operator'?'https://www.homedesignlab.it/attiva-account.html':'https://www.homedesignlab.it/imposta-password.html';
        const {error:mailError}=await anon.auth.resetPasswordForEmail(email,{redirectTo});
        if(mailError)throw mailError;
        if(entity==='operator')await admin.from('operator_audit_log').insert({operator_profile_id:profile.id,actor_user_id:req.user.id,action:'invito_reinviato',details:{email}});
        res.json({ok:true,emailSent:true,email});
    }catch(error){console.error('[reinvia-invito]',error.message);res.status(500).json({error:error.message||'Errore durante il reinvio'})}
});

app.use('/api', apiRouter);

app.get('/api/config', (_req,res)=>{res.json({supabaseUrl:CONFIG.SUPABASE.URL,supabaseAnonKey:CONFIG.SUPABASE.ANON_KEY})});
app.get('/api/instagram',async(_req,res)=>{const token=CONFIG.INSTAGRAM_TOKEN;if(!token)return res.json([]);try{const response=await fetch('https://graph.instagram.com/me/media?fields=id,media_url,thumbnail_url,permalink,caption&access_token='+token,{headers:{'User-Agent':'HDL-Server/1.0'}});if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();res.json((data.data||[]).slice(0,8).map(post=>({image:post.thumbnail_url||post.media_url,url:post.permalink,caption:(post.caption||'').slice(0,120)})))}catch(err){res.json([])}});

const publicPages={'/':'index.html','/index.html':'index.html','/chi-siamo':'chi-siamo.html','/chi-siamo.html':'chi-siamo.html','/servizi-lab':'servizi-lab.html','/servizi-lab.html':'servizi-lab.html','/portfolio':'portfolio.html','/portfolio.html':'portfolio.html','/journal':'journal.html','/journal.html':'journal.html','/collection':'collection.html','/collection.html':'collection.html','/contatti':'contatti.html','/contatti.html':'contatti.html','/login':'login.html','/login.html':'login.html','/imposta-password':'imposta-password.html','/imposta-password.html':'imposta-password.html','/dettaglio-progetto':'dettaglio-progetto.html','/dettaglio-progetto.html':'dettaglio-progetto.html','/dettaglio-immobile':'dettaglio-immobile.html','/dettaglio-immobile.html':'dettaglio-immobile.html','/dettaglio-journal':'dettaglio-journal.html','/dettaglio-journal.html':'dettaglio-journal.html'};
for(const [route,file] of Object.entries(publicPages)){app.get(route,(_req,res)=>res.sendFile(join(templatesDir,file)))}
app.get('/portale-cliente',(_req,res)=>{res.sendFile(join(templatesDir,'portale-cliente.html'),err=>{if(err)res.status(404).json({error:'Pagina non trovata'})})});
app.use((err,_req,res,_next)=>{console.error('[server]',err.message);res.status(500).json({error:'Internal Server Error',message:err.message})});
app.listen(port,()=>{console.log(`Home Design Lab → http://localhost:${port}`);console.log(`Supabase configured: ${Boolean(CONFIG.SUPABASE.URL)}`);});

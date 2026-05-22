import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { textContent } = await req.json();
    if (!textContent || textContent.trim().length === 0) {
      throw new Error("Nessun testo ricevuto dal documento.");
    }

    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY non configurata nei Secrets di Supabase.");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Sei un analista tecnico immobiliare. Estrai i dati ESATTAMENTE come sono scritti nel documento. NON INVENTARE MAI città, prezzi o dati non presenti nel testo. Se un dato (come il prezzo o la città) manca, restituisci null o 0, non scrivere testo come 'contattaci'.\n\nRestituisci SOLO un JSON valido con chiavi in italiano: titolo, descrizione, superficie, citta, prezzo_richiesta, tipologia.\n\nREGOLE:\n1. TITOLO: Cerca nel testo parole chiave come 'Progetto', 'Relazione Tecnica', 'Committente', 'Oggetto' o l'indirizzo dell'immobile. Scarta intestazioni di studi professionali, date e numeri di protocollo. Crea un titolo descrittivo (es: 'Attico Moderno in Via Roma 12'). NON copiare la prima riga.\n\n2. SUPERFICIE: Se trovi una tabella di superfici, somma i singoli vani. Prediligi calpestabile > commerciale > catastale.\n\n3. DESCRIZIONE: Scrivi una breve descrizione commerciale che valorizzi i materiali, la luminosità e gli spazi. Massimo 3-4 righe.\n\n4. PREZZO e CITTÀ: Se non sono esplicitamente scritti nel testo, restituisci 0 per prezzo e stringa vuota per città. NON inventare assolutamente nulla.\n\n5. Se trovi valori in inglese (title, description, surface_area, city, price, property_type), mappali alle chiavi italiane richieste." },
          { role: "user", content: `Testo del documento: ${textContent}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: "Errore API DeepSeek",
        details: result
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiText = result.choices[0].message.content;
    return new Response(aiText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})

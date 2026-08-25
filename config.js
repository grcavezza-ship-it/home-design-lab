const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const smtpHost = (process.env.SMTP_HOST || 'smtps.aruba.it').trim();
const configuredPort = toInt(process.env.SMTP_PORT, 465);
const smtpPort = smtpHost === 'smtps.aruba.it' && configuredPort === 587 ? 465 : configuredPort;
const smtpUser = (process.env.SMTP_USER || '').trim();

const CONFIG = {
    APP: {
        NAME: 'Home Design Lab',
        VERSION: '1.0.0',
        ENVIRONMENT: process.env.NODE_ENV || 'development',
        DEBUG: process.env.NODE_ENV === 'development',
        PORT: toInt(process.env.PORT, 3000),
        SITE_URL: process.env.SITE_URL || ''
    },
    API: {
        BASE_PATH: '/api',
        TIMEOUT: toInt(process.env.API_TIMEOUT, 10000)
    },
    SUPABASE: {
        URL: process.env.SUPABASE_URL || '',
        ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
        SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    STORAGE: {
        BUCKET: process.env.STORAGE_BUCKET || 'project-documents',
        MAX_FILE_SIZE: toInt(process.env.MAX_FILE_SIZE, 10485760),
        ALLOWED_TYPES: process.env.ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'application/pdf']
    },
    GOOGLE_DRIVE: {
        SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
        ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
        ENABLED: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID)
    },
    SMTP: {
        HOST: smtpHost,
        PORT: smtpPort,
        USER: smtpUser,
        PASS: process.env.SMTP_PASS || '',
        FROM_NAME: process.env.SMTP_FROM_NAME || 'Home Design Lab',
        FROM_EMAIL: (process.env.SMTP_FROM_EMAIL || smtpUser).trim()
    },
    INSTAGRAM_TOKEN: process.env.INSTAGRAM_TOKEN || ''
};

export default CONFIG;

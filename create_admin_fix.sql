-- Crea Admin User - Metodo sicuro
-- Disabilita il trigger temporaneamente, crea l'utente, poi riabilita

-- 1. Disabilita il trigger temporaneamente
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 2. Crea l'utente admin
DO $$
DECLARE
    admin_email TEXT := 'info@homedesignlab.it';
    admin_password TEXT := 'Admin123456';
    admin_full_name TEXT := 'Admin Home Design Lab';
    admin_user_id UUID;
BEGIN
    -- Verifica se esiste già
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Utente già esistente: %', admin_user_id;
        
        -- Aggiorna a admin
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_build_object('role', 'admin', 'full_name', admin_full_name),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = admin_user_id;
        
        -- Assicurati che il profilo esista
        INSERT INTO profiles (user_id, email, role, full_name, created_at, updated_at)
        VALUES (admin_user_id, admin_email, 'admin', admin_full_name, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'admin',
            full_name = admin_full_name,
            updated_at = NOW();
            
        RAISE NOTICE 'Utente aggiornato ad admin';
    ELSE
        -- Crea nuovo utente
        admin_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_sent_at,
            is_sso_user, is_anonymous
        ) VALUES (
            admin_user_id, admin_email, crypt(admin_password, gen_salt('bf')), NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('role', 'admin', 'full_name', admin_full_name),
            NOW(), NOW(), NOW(), false, false
        );
        
        -- Crea il profilo manualmente
        INSERT INTO profiles (user_id, email, role, full_name, created_at, updated_at)
        VALUES (admin_user_id, admin_email, 'admin', admin_full_name, NOW(), NOW());
        
        RAISE NOTICE 'Nuovo admin creato: %', admin_user_id;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN PRONTO!';
    RAISE NOTICE 'Email: %', admin_email;
    RAISE NOTICE 'Password: %', admin_password;
    RAISE NOTICE '========================================';
END $$;

-- 3. Riabilita il trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 4. Verifica
SELECT 
    u.id, u.email, 
    u.raw_user_meta_data->>'role' as role,
    u.raw_user_meta_data->>'full_name' as full_name,
    p.role as profile_role,
    u.email_confirmed_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'info@homedesignlab.it';

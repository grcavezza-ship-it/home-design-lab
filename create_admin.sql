-- Crea Admin User direttamente via SQL
-- Esegui questo su Supabase SQL Editor

-- Parametri configurabili
DO $$
DECLARE
    admin_email TEXT := 'info@homedesignlab.it';
    admin_password TEXT := 'Admin123456';  -- Cambia questa password!
    admin_full_name TEXT := 'Admin Home Design Lab';
    admin_user_id UUID;
BEGIN
    -- Verifica se l'utente esiste già
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Utente % esiste già con ID: %', admin_email, admin_user_id;
        
        -- Aggiorna il profilo esistente ad admin se necessario
        UPDATE profiles 
        SET role = 'admin', 
            full_name = admin_full_name,
            updated_at = NOW()
        WHERE user_id = admin_user_id;
        
        RAISE NOTICE 'Profilo aggiornato a admin';
    ELSE
        -- Crea nuovo utente in auth.users
        admin_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_sent_at,
            is_sso_user,
            is_anonymous
        ) VALUES (
            admin_user_id,
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object(
                'role', 'admin',
                'full_name', admin_full_name
            ),
            NOW(),
            NOW(),
            NOW(),
            false,
            false
        );
        
        RAISE NOTICE 'Utente creato con ID: %', admin_user_id;
        
        -- Il trigger on_auth_user_created creerà automaticamente il profilo
        -- ma verifichiamo e aggiorniamo se necessario
        INSERT INTO profiles (user_id, email, role, full_name, created_at, updated_at)
        VALUES (admin_user_id, admin_email, 'admin', admin_full_name, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            role = 'admin',
            full_name = admin_full_name,
            updated_at = NOW();
        
        RAISE NOTICE 'Profilo admin creato/aggiornato';
    END IF;
    
    -- Verifica finale
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN CREATO/AGGIORNATO CON SUCCESSO!';
    RAISE NOTICE 'Email: %', admin_email;
    RAISE NOTICE 'Password: %', admin_password;
    RAISE NOTICE 'User ID: %', admin_user_id;
    RAISE NOTICE '========================================';
    
END $$;

-- Verifica: mostra l'utente admin creato
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.raw_user_meta_data->>'role' as role,
    u.raw_user_meta_data->>'full_name' as full_name,
    p.created_at as profile_created
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.raw_user_meta_data->>'role' = 'admin'
   OR p.role = 'admin'
ORDER BY u.created_at DESC
LIMIT 5;

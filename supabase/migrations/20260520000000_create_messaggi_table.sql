-- =============================================================================
-- Home Design Lab - Tabella messaggi per chat cliente-operatore
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messaggi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mittente_id UUID NOT NULL REFERENCES auth.users(id),
    destinatario_id UUID NOT NULL REFERENCES auth.users(id),
    progetto_id INTEGER REFERENCES public.projects(id),
    testo TEXT NOT NULL,
    letto BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messaggi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti vedono propri messaggi" ON public.messaggi
    FOR ALL USING (mittente_id = auth.uid() OR destinatario_id = auth.uid());

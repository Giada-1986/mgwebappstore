
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  has_paid BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'it',
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  triggers TEXT[] NOT NULL DEFAULT '{}',
  trigger_other TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hunger_type TEXT NOT NULL,
  emotion TEXT,
  note TEXT,
  action_chosen TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX checkins_user_created_idx ON public.checkins (user_id, created_at DESC);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_en TEXT NOT NULL,
  instructions TEXT NOT NULL,
  instructions_en TEXT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 60,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises readable" ON public.exercises FOR SELECT TO anon, authenticated USING (true);

CREATE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.exercises (slug, title, title_en, instructions, instructions_en, duration_seconds, sort_order) VALUES
('478','Respirazione 4-7-8','4-7-8 Breathing','Inspira dal naso contando fino a 4, trattieni per 7, espira lentamente dalla bocca per 8. Ripeti 4 volte.','Breathe in through your nose for 4, hold for 7, exhale slowly through your mouth for 8. Repeat 4 times.',90,1),
('three-things','Tre cose che stanno succedendo','Three things happening now','Scrivi (o dì a voce) tre cose che stanno succedendo in questo momento, senza giudicarle. Solo fatti.','Write down (or say out loud) three things happening right now, without judging them. Just facts.',90,2),
('water','Un bicchiere d''acqua','A glass of water','Bevi lentamente un bicchiere d''acqua a piccoli sorsi, poi aspetta cinque minuti prima di decidere.','Slowly sip a full glass of water, then wait five minutes before deciding.',120,3),
('call','Una telefonata veloce','A quick phone call','Chiama qualcuno a cui vuoi bene, anche solo per due minuti. A volte la fame è voglia di compagnia.','Call someone you love, even for two minutes. Sometimes hunger is a wish for company.',120,4),
('air','Due minuti d''aria','Two minutes of air','Esci sul balcone o davanti alla porta. Respira, guarda lontano, senti la temperatura sulla pelle.','Step outside or onto a balcony. Breathe, look into the distance, feel the air on your skin.',120,5),
('body-scan','Ascolto del corpo','Body scan','Chiudi gli occhi. Parti dai piedi e sali fino alla testa, notando dove senti tensione. Non cambiare nulla.','Close your eyes. Start at your feet and move up to your head, noticing tension. Change nothing.',120,6),
('stretch','Allungamento breve','Short stretch','Alzati, allunga le braccia verso l''alto, ruota le spalle, piega dolcemente il collo da un lato all''altro.','Stand up, reach your arms overhead, roll your shoulders, gently tilt your neck side to side.',60,7),
('name-emotion','Dai un nome all''emozione','Name the emotion','Completa la frase: "In questo momento sto provando..." e ripetila due volte, con gentilezza.','Complete the sentence: "Right now I am feeling..." and repeat it twice, kindly.',60,8),
('tea','Prepara una tisana','Make a cup of tea','Prepara una tisana calda con calma. Il gesto di prendersi cura di sé conta quanto la bevanda.','Slowly make a warm cup of tea. The act of caring for yourself matters as much as the drink.',120,9),
('music','Una canzone intera','One whole song','Metti una canzone che ami e ascoltala fino alla fine, senza fare altro.','Play a song you love and listen to it all the way through, doing nothing else.',120,10);

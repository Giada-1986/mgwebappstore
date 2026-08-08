INSERT INTO public.products (
  slug, name_it, name_en,
  short_description_it, short_description_en,
  description_it, description_en,
  category_id, price, currency, product_type, status, app_path,
  access_mode, sort_order, accent_color
)
SELECT
  'fame-o-emozione',
  'Fame o Emozione?',
  'Hunger or Emotion?',
  'Un check-in di 90 secondi per capire se la fame viene dal corpo o dalle emozioni.',
  'A 90-second check-in to tell body hunger from emotional hunger.',
  'Fame o Emozione? ti accompagna in un check-in guidato di 90 secondi: una breve riflessione, poche domande mirate, un risultato chiaro e un passo successivo concreto. Include lo storico dei check-in e funziona in italiano, inglese, spagnolo, tedesco e francese.',
  'Hunger or Emotion? guides you through a 90-second check-in: a short reflection, a few focused questions, a clear result and one concrete next step. Includes your check-in history and works in Italian, English, Spanish, German and French.',
  (SELECT id FROM public.categories ORDER BY sort_order LIMIT 1),
  9.90, 'EUR', 'mini_app', 'draft', '/app/fame-o-emozione',
  'paid', 1, '#D7B766'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'fame-o-emozione');
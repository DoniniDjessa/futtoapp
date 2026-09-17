-- Colonnes additionnelles pour correspondre à la fiche de détail du terrain
-- Description, équipements (amenities), galerie photos, contact du gérant, horaires d'ouverture

alter table public.futto_terrains
  add column if not exists description text,
  add column if not exists amenities text[],
  add column if not exists photos text[],
  add column if not exists contact_phone text,
  add column if not exists opening_time text default '08:00',
  add column if not exists closing_time text default '23:00';

comment on column public.futto_terrains.description is 'Description / présentation et règles du terrain';
comment on column public.futto_terrains.amenities is 'Liste des équipements disponibles (parking, vestiaires, douches, wifi, eclairage, buvette, tribunes)';
comment on column public.futto_terrains.photos is 'Galerie d''URLs photos additionnelles du terrain';
comment on column public.futto_terrains.contact_phone is 'Numéro WhatsApp ou appel du gérant / gestionnaire';
comment on column public.futto_terrains.opening_time is 'Heure d''ouverture (ex: 08:00)';
comment on column public.futto_terrains.closing_time is 'Heure de fermeture (ex: 23:00)';

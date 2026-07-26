-- ============================================================
-- UX Store — demo catalogue
--
-- Placeholder content so the storefront is never empty during
-- development. cover_image_url is intentionally NULL: the UI renders a
-- deterministic gradient from the product slug, so there are no broken
-- external image links and no CDN dependency before real art exists.
-- Replace all of this from the admin panel before going live.
-- ============================================================

insert into public.categories (name, slug, description, icon, sort_order) values
  ('Web Scripts',   'web-scripts',   'Complete PHP and Node.js web applications, ready to deploy.', 'globe',       1),
  ('Templates',     'templates',     'Responsive website templates and UI kits.',                    'layout-template', 2),
  ('Bots &amp; Automation', 'bots-automation', 'Telegram, WhatsApp and Discord bots plus automation tools.', 'bot', 3),
  ('Mobile Apps',   'mobile-apps',   'React Native and Flutter application source code.',            'smartphone',  4)
on conflict (slug) do nothing;

insert into public.products
  (title, slug, short_description, description, price_inr, compare_at_price, category_id,
   tech_stack, features, version, is_active, is_featured)
values
  (
    'Anime Streaming CMS',
    'anime-streaming-cms',
    'Full streaming site with admin panel, multi-server episodes, comments and reactions.',
    E'A complete anime/donghua streaming platform.\n\n- Multi-server episode playback\n- Threaded comments with reactions\n- Admin dashboard with 2FA and login history\n- View and like tracking per episode\n- SEO-friendly slugs throughout\n\nDelivered as a ZIP with the full source, a database installer and a setup guide.',
    2999, 4999,
    (select id from public.categories where slug = 'web-scripts'),
    array['PHP 8', 'MySQL', 'Bootstrap 5', 'jQuery'],
    array['Admin panel', 'Two-factor auth', 'Comment system', 'Multi-server player', 'Installer script'],
    '2.1.0', true, true
  ),
  (
    'Digital Store Starter',
    'digital-store-starter',
    'React storefront for selling digital products with manual delivery.',
    E'A production-ready storefront for selling scripts and source code.\n\n- Product catalogue with categories and search\n- Pluggable payment gateway adapter\n- Order tracking for buyers\n- Admin fulfilment queue\n\nIncludes the full React source and the database schema.',
    3999, 6999,
    (select id from public.categories where slug = 'web-scripts'),
    array['React 19', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    array['Liquid glass UI', 'Row level security', 'Admin dashboard', 'Order timeline'],
    '1.0.0', true, true
  ),
  (
    'Glassmorphism Dashboard Kit',
    'glassmorphism-dashboard-kit',
    'Forty-plus dashboard screens with a full liquid-glass component library.',
    E'A complete admin dashboard UI kit.\n\n- 40+ prebuilt screens\n- Light and dark themes\n- Chart components included\n- Fully responsive down to 360px\n\nFigma source file included alongside the code.',
    1499, 2499,
    (select id from public.categories where slug = 'templates'),
    array['React', 'Tailwind CSS', 'Recharts', 'Figma'],
    array['40+ screens', 'Dark mode', 'Figma file', 'Chart library'],
    '3.0.2', true, true
  ),
  (
    'WhatsApp Order Bot',
    'whatsapp-order-bot',
    'Takes orders over WhatsApp, confirms payment and notifies you instantly.',
    E'An automation bot that runs your order desk on WhatsApp.\n\n- Menu-driven order capture\n- Payment confirmation flow\n- Instant owner notification\n- Order log exportable to CSV',
    1999, null,
    (select id from public.categories where slug = 'bots-automation'),
    array['Node.js', 'Baileys', 'SQLite'],
    array['Menu builder', 'Owner alerts', 'CSV export', 'Session persistence'],
    '1.4.0', true, false
  ),
  (
    'Telegram File Store Bot',
    'telegram-file-store-bot',
    'Store files on Telegram and share them through permanent short links.',
    E'Turn a Telegram channel into a file host.\n\n- Permanent shareable links\n- Force-subscribe support\n- Broadcast to all users\n- Admin-only upload controls',
    999, 1799,
    (select id from public.categories where slug = 'bots-automation'),
    array['Python', 'Pyrogram', 'MongoDB'],
    array['Short links', 'Force subscribe', 'Broadcast', 'Admin controls'],
    '2.0.0', true, false
  ),
  (
    'Flutter E-Commerce App',
    'flutter-ecommerce-app',
    'Cross-platform shopping app with cart, checkout and order history.',
    E'A complete Flutter shopping application for Android and iOS.\n\n- Product catalogue and search\n- Cart and checkout flow\n- Order history\n- Push notification ready',
    4999, 7999,
    (select id from public.categories where slug = 'mobile-apps'),
    array['Flutter', 'Dart', 'Firebase'],
    array['Android + iOS', 'Cart & checkout', 'Push notifications', 'Order history'],
    '1.2.0', true, false
  )
on conflict (slug) do nothing;

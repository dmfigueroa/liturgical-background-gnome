application_id = 'com.dmfigueroa.LiturgicalBackgroundGNOME'

png_dir = 'hicolor' / '128x128' / 'apps'
install_data(
  png_dir / ('@0@.png').format(application_id),
  install_dir: get_option('datadir') / 'icons' / png_dir
)

high_resolution_dir = 'hicolor' / '512x512' / 'apps'
install_data(
  high_resolution_dir / ('@0@.png').format(application_id),
  install_dir: get_option('datadir') / 'icons' / high_resolution_dir
)

symbolic_dir = 'hicolor' / 'symbolic' / 'apps'
install_data(
  symbolic_dir / ('@0@-symbolic.svg').format(application_id),
  install_dir: get_option('datadir') / 'icons' / symbolic_dir
)

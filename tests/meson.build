gjs = find_program('gjs')
foreach test_name : ['liturgical-state', 'scheduler', 'wallpaper-state', 'calendar-repository', 'thumbnail-cache', 'thumbnail-worker', 'thumbnail-repository']
  test(test_name, gjs, args: ['-m', meson.current_source_dir() / ('test-' + test_name + '.js')],
    env: ['GSETTINGS_BACKEND=memory'])
endforeach

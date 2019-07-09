if exists('did_imselect_loaded') || v:version < 800
  finish
endif
let did_imselect_loaded = 1
let s:root = expand('<sfile>:h:h')

function! s:on_data(str)
  let g:current_input = a:str
  silent doautocmd User CocInputMethodChange
endfunction

function! s:on_exit(...)
  echohl Error | echon 'Exited' | echohl None
endfunction

function! s:StartOberver()
  let cmd = s:root.'/bin/observer'
  if has('nvim')
    let id = jobstart([cmd], {
          \ 'pty': 1,
          \ 'width': 80,
          \ 'height': 30,
          \ 'on_stdout': {j,d,e-> s:on_data(trim(d[0]))},
          \ 'on_exit': function('s:on_exit')
          \ })
    if id <= 0
      echohl Error | echon '[coc-imselect] observer job failed to start' | echohl None
    endif
  else
    let options = {
          \ "out_io": "pipe",
          \ 'out_cb': {channel, message -> s:on_data(trim(message))},
          \ 'exit_cb': function('s:on_exit'),
          \ 'pty': 1,
          \ }
    if has("patch-8.1.350")
      let options['noblock'] = 1
    endif
    let job = job_start([cmd], options)
    let status = job_status(job)
    if status !=# 'run'
      echohl Error | echon '[coc-imselect] observer job failed to start' | echohl None
    endif
  endif
endfunction

call s:StartOberver()

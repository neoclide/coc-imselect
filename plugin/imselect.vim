if exists('did_imselect_loaded') || v:version < 700
  finish
endif
let did_imselect_loaded = 1
let s:root = expand('<sfile>:h:h')

function! s:on_data(str)
  let g:current_input = a:str
endfunction

function! s:on_exit()
  echohl Error | echon 'Exited' | echohl None
endfunction

function! s:StartOberver()
  let cmd = s:root.'/bin/observer'
  let id = jobstart([cmd], {
        \ 'pty': 1,
        \ 'width': 80,
        \ 'height': 30,
        \ 'on_stdout': {j,d,e-> s:on_data(trim(d[0]))},
        \ 'on_exit': function('s:on_exit')
        \ })
endfunction

call s:StartOberver()


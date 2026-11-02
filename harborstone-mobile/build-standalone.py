# Builds Harborstone_Mobile_Standalone.html: one file with all CSS/JS inlined (for opening by double-click or on a phone).
import re,base64,os
pub='public'; h=open(f'{pub}/index.html').read()
def css(m): return '<style>'+open(f'{pub}/{m.group(1)}').read()+'</style>'
def js(m): return '<script>'+open(f'{pub}/{m.group(1)}').read().replace('</script>','<\\/script>')+'</script>'
h=re.sub(r'<link rel="stylesheet" href="([^"]+)">',css,h)
h=re.sub(r'<script src="([^"]+)"></script>',js,h)
ic=base64.b64encode(open(f'{pub}/icons/favicon.png','rb').read()).decode()
h=re.sub(r'<link rel="icon"[^>]*>',f'<link rel="icon" href="data:image/png;base64,{ic}">',h)
h=re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>','',h)
open('Harborstone_Mobile_Standalone.html','w').write(h); print(len(h))

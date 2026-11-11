import os,re,sys,html,urllib.parse,collections
SITE=sys.argv[1] if len(sys.argv)>1 else '_site'; PREFIX=sys.argv[2] if len(sys.argv)>2 else '/'
bad=collections.defaultdict(list); n=0; refs=0; ext=set()
attr=re.compile(r'''(?:href|src|content)\s*=\s*["']([^"']+)["']''',re.I)
for dp,_,fs in os.walk(SITE):
    if '/pagefind' in dp: continue
    for f in fs:
        if not f.endswith('.html'): continue
        p=os.path.join(dp,f); n+=1; s=open(p,encoding='utf-8').read()
        for m in attr.finditer(s):
            u=html.unescape(m.group(1))
            if m.group(0).lower().startswith('content'):
                mm=re.match(r'\d+;\s*url=(.+)',u)
                if not mm: continue
                u=mm.group(1)
            if u.startswith(('http://','https://','//')): ext.add(u.split('/')[2] if '//' in u else u); continue
            if u.startswith(('#','mailto:','data:','javascript:')): continue
            refs+=1
            path=urllib.parse.unquote(u.split('#')[0].split('?')[0])
            if not path.startswith('/'): path=os.path.normpath(os.path.join('/'+os.path.relpath(dp,SITE)[len('.'):] if dp!=SITE else '/', path))
            if not path.startswith(PREFIX): bad['no-prefix'].append((p,u)); continue
            rel=path[len(PREFIX):]
            t=os.path.join(SITE,rel)
            if path.endswith('/'): t=os.path.join(t,'index.html')
            if not os.path.exists(t): bad['missing'].append((p,u))
print('html files',n,'local refs',refs,'external hosts',sorted(ext)[:20])
for k,v in bad.items(): print(k,len(v),v[:10])
print('BROKEN TOTAL',sum(len(v) for v in bad.values()))

from pathlib import Path

p = Path('app.js')
s = p.read_text()
alt = '''function alleProfileUebernehmen(liste){
  const neuerStand = Math.max(0, ...liste.map(paketDatenstand));
  if(neuerStand > SCHEMA) return alert(neuereDatenText(neuerStand));
  if(!confirm("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "
    + "Gerät werden dadurch ersetzt. Fortfahren?")) return;
  const vorher = profile.map(p => p.id), neu = [];
  liste.slice(0, 20).forEach((p, i) => {
'''
neu = '''function alleProfileUebernehmen(liste){
  /* Es werden höchstens 20 Profile übernommen. Auch die Prüfung bleibt auf
     diese Grenze beschränkt: ein riesiges manipuliertes Array darf weder
     unnötig komplett durchlaufen noch über Spread-Argumente den Stack sprengen. */
  const begrenzt = liste.slice(0, 20);
  const neuerStand = begrenzt.reduce((m,p) => Math.max(m, paketDatenstand(p)), 0);
  if(neuerStand > SCHEMA) return alert(neuereDatenText(neuerStand));
  if(!confirm("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "
    + "Gerät werden dadurch ersetzt. Fortfahren?")) return;
  const vorher = profile.map(p => p.id), neu = [];
  begrenzt.forEach((p, i) => {
'''
if s.count(alt) != 1:
    raise SystemExit(f'Profilbegrenzung: erwartet 1 Treffer, gefunden {s.count(alt)}')
p.write_text(s.replace(alt, neu))

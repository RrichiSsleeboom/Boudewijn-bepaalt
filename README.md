# De Laatste Trein / The Last Train

Een browsergame over honderd mensen uit de hele wereld die in één trein leven, na een uitbraak van zombies. Het eten raakt op. Je moet passagiers achterlaten of opofferen, zombies bestrijden om voedsel te vinden, de trein naar het Noorden brengen en de wereld stap voor stap herbouwen.

Beschikbaar in Nederlands en Engels (wisselen via de knop rechtsboven).

## Spelen

Er is geen build-stap en geen installatie nodig.

```bash
npm start
```

Open daarna http://localhost:8080 in je browser. Je kunt ook `index.html` direct openen.

## Hoe het werkt

- **Passagiers:** 100 mensen uit 20 landen, elk met een beroep, een vaardigheid en een verborgen karakter. Het spel is per startpunt reproduceerbaar.
- **Dagen:** elke dag eet de trein van de voorraad. Bij minder dan twee dagen eten volgt een hongercrisis: rantsoeneren, iemand opofferen of achterlaten, of afwachten.
- **Opofferen:** vier manieren om iemand te kiezen (oudste, jongste, vrijwilliger, loting). Elke keuze kost geweten en moraal. Achterlaten bij een station kost minder dan opofferen.
- **Route:** tien stations van Oostrand naar Noordhaven. Reizen kost dagen en brandstof. Onderweg kunnen zombies de trein aanvallen, en komen er gebeurtenissen met keuzes.
- **Zoeken:** bij elk station stuur je een ploeg van 2 tot 4 mensen het veld op. Verzamel kratten, sla of schiet zombies. Elk station kan één keer worden doorzocht.
- **Herbouw:** in nederzettingen bouw je modules (kas, waterzuivering, generator, radio, kliniek, school).
- **Eindes:** De Haven, Het Zaad, Het Geweten, De Stille Trein of Verloren op de Rails.

Het spel slaat na elke actie op in je browser (localStorage). Een ander apparaat of browser begint niet met jouw voortgang.

### Besturing

- Scherm: knoppen. Op de zoekpagina ook on-screen pijltjes, slaan en schieten.
- Toetsenbord op het zoekveld: pijltjes of WASD bewegen, spatie slaat, F schiet.

## Structuur

```
index.html            pagina en topbalk
css/style.css         stijlen (licht en donker)
js/main.js            scene-manager en opslaan
js/core/              spellogica zonder beeld (eten, reizen, opofferen, zoeken, herbouw, eindes)
js/data/              inhoud: stations, gebeurtenissen, modules, namen, eindes
js/i18n/              vertalingen (nl.js, en.js)
js/scenes/            schermen (menu, trein, route, zoeken, herbouw, einde)
js/ui/                kleine hulpjes (dom, modal)
tests/                tests voor de spellogica
```

## Tests

```bash
npm test
```

De tests draaien in Node 18 of later en dekken de spellogica: passagiers, voedsel, opofferingen, reizen, zoeken, herbouw, eindes en de vertalingen.

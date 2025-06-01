## Cíl projektu

Cílem tohoto projektu je vytvořit interaktivní webovou aplikaci pro geografické kvízy, která umožní uživatelům:

* **Otestovat si znalosti zeměpisu** prostřednictvím předpřipravených (vestavěných) sad otázek pokrývajících různé světadíly a geografické regiony.
* **Vytvářet a spravovat vlastní kvízy** (včetně možnosti přidat audio nebo video k otázce), ukládat je lokálně do prohlížeče a případně je exportovat/importovat ve formátu JSON.
* **Ukládat a zobrazovat vysoké skóre** jednotlivých uživatelů pro jednotlivé kvízy.
* **Poskytovat atraktivní uživatelské rozhraní** s responzivním designem, animacemi a přehlednými grafy výsledků.
* **Podporovat offline režim** pomocí Service Workeru, aby bylo možné aplikaci používat i bez připojení k internetu.

## Postup (architektura a vývoj)

1. **Definice struktury projektu**

    * Rozdělení do hlavních složek:

        * `/css` – styly aplikace (soubor `styles.css`)
        * `/js` – veškeré skripty rozdělené na:

            * `controllers` – komponenty řídící logiku jednotlivých částí (Home, Quiz, Results, Scores, Control Panel, Authoring apod.)
            * `dataService.js` – načítání vestavěných a vlastních kvízů (z `/data/*.json` nebo `localStorage`)
            * `scoreService.js` – správa a řazení výsledků v `localStorage`
            * `utils.js` – pomocné funkce (např. míchání polí)
        * `/data` – JSON soubory s vestavěnými sadami otázek pro jednotlivé regiony (Afrika, Evropa, …)
        * `/media` – zvukové soubory (`background-music.mp3`, `finish-sound.mp3`)
        * `index.html` – hlavní HTML kostra celé aplikace
        * `sw.js` – Service Worker pro cacheování statických souborů a offline podporu
    * V kořenové úrovni je také:

        * `.gitignore` – ignorování IDE složek atd.
        * `README.md` – prostor pro dokumentaci (tento soubor)

2. **Návrh uživatelského rozhraní (HTML + CSS)**

    * **`index.html`** definuje:

        * `<nav id="main-nav">` – horní navigační lišta, která obsahuje logo (🌍 Geografie Kvízy), pole pro jméno hráče a tlačítka pro přechod na domovskou, žebříček a správu vlastních kvízů.
        * `<main>` – pět hlavních sekcí (skryté/přepínané třídou `active`):

            1. **Home / Quiz selection** (`#home-screen`)
            2. **Quiz screen** (`#quiz-screen`)
            3. **Results screen** (`#results-screen`)
            4. **High-Score screen** (`#scores-screen`)
            5. **Control Panel / Správa vlastních kvízů** (`#control-panel-screen`)
            6. **Authoring screen / Vytváření a úprava kvízu** (`#authoring-screen`)
        * Audio (`<audio id="bgMusic">`, `<audio id="finishSound">`) pro přehrávání hudby během kvízu a zvuk ke konci.
        * Na konci `<script type="module" src="js/app.js"></script>` pro načtení hlavního JavaScriptu.
    * **`css/styles.css`** obsahuje:

        * Definici barevných proměnných (`:root { --primary-color: #667eea; … }`).
        * Reset stylů a základní nastavení (`* { box-sizing: border-box; }`, `body { font-family: Inter, …; background: …; }`).
        * Styly pro navigaci (`#main-nav`), hlavičku, tlačítka, vstupy, barevná schémata.
        * Rozvržení jednotlivých sekcí s animacemi (`fadeIn`, `slideInUp`).
        * Detailní styly pro:

            * **Home Screen** – grid tlačítek k vízům, animace tlačítek
            * **Quiz Screen** – karta otázky, výběr odpovědí, progress bar, timer
            * **Results Screen** – karta výsledků s canvas pro vykreslení grafu
            * **Scores Screen** – seznam top skóre
            * **Control Panel** – správa vlastních kvízů (seznam, tlačítka Hrát / Upravit / Export / Smazat)
            * **Authoring Screen** – formulář pro zadávání názvu kvízu, bloky pro každou otázku (text + odpovědi + nahrání média), validace polí
        * Responzivní media queries pro štíhlejší zařízení (max-width: 768px, 480px) a podpora tmavého režimu (`@media (prefers-color-scheme: dark)`).

3. **JavaScriptová logika (MVC podoba)**

    * **Hlavní vstupní bod – `js/app.js`**

        1. Po načtení (`DOMContentLoaded`) zaregistruje Service Workera (`sw.js`).
        2. Inicializuje audio (předá `<audio>` prvky do `audioController.js`).
        3. Vytvoří instanci `new AppController()`, která spravuje přechody mezi jednotlivými sekcemi a orchestrace všech ostatních controllerů.
    * **`controllers/appController.js`**

        * Drží referenci na DOM prvky jednotlivých sekcí (home, quiz, results, scores, control panel, authoring).
        * Načítá instanci `HomeController`, `QuizControllerUI`, `ResultsController`, `ScoresController`, `ControlPanelController`, `AuthoringController`, a také `QuizController` (logika kvízu).
        * Poslouchá události na tlačítkách v navigaci (Domů, Žebříček, Správa) a řídí viditelnost sekcí (`showSection(...)`).
        * Metoda `startQuiz(topicId, titleLabel)`:

            1. Přeruší předchozí kvíz (kdyby běžel).
            2. Uloží jméno hráče (z `HomeController`).
            3. Spustí logiku kvízu (`QuizController.startQuiz(topicId)`).
            4. Provede `history.pushState` pro správu historie (když uživatel použije tlačítko zpět).
        * Metoda `handleResults(resultsObj)` se volá po dokončení kvízu a uloží skóre (`scoreService.addScore(...)`) a přepne na Results sekci.
        * Metody `showScores()`, `showControlPanel()`, `showAuthoringBlank()`, `showAuthoringEdit(...)`, `backToHome()`, `_onPopState(event)` pro přechody mezi stavy aplikace.
    * **`controllers/homeController.js`**

        * Řídí Home/Quiz selection sekci:

            1. Kontroluje, zda bylo zadáno jméno hráče. Pokud ne, tlačítka pro spuštění kvízu jsou deaktivována a zobrazí se hláška „Prosím, zadejte své jméno nebo iniciály.“
            2. Metoda `buildQuizList()` dynamicky vytvoří tlačítka pro vestavěné kvízy a případně pro vlastní kvízy (načtené z `dataService.getAllCustomQuizzes()`).
            3. Po kliknutí na tlačítko kvízu se volá `app.startQuiz(id, label)`.
    * **`controllers/quizController.js`**

        * Zajišťuje samotný průběh kvízu (timer, výběr odpovědí).

            1. Metoda `startQuiz(topic)` načte data kvízu (`dataService.loadQuizData(topic)`), vygeneruje strukturu otázek a spustí hudbu (`playMusic()`).
            2. Interně udržuje `currentIndex`, `correctCount`, `answers[]`, `questionTimer` s výchozí časovou limitou 15 s (konstanta `TIME_LIMIT`).
            3. V metodě `_renderCurrentQuestion()` vynuluje timer, odešle do UI informace přes `onQuestionRendered({...})` a spustí odpočítávání (každou sekundu se hodnota `timeLeft--` a volá se `onQuestionRendered` pro aktualizaci zobrazení).
            4. Pokud `timeLeft` dosáhne nuly, volá se `_autoSkip()`, čímž se otázka označí jako špatná a uživatel může pokračovat.
            5. Metoda `selectAnswer(chosenIndex)` zastaví timer, vyhodnotí správnost, uloží do `answers[]` a znovu zavolá `onQuestionRendered` s informacemi o vybraném stavu (barevné zvýraznění tlačítek).
            6. Metoda `nextQuestion()` ruší timer, posouvá `currentIndex++`. Pokud je index mimo rozsah, zastaví hudbu, přehraje zvuk na konci (`playFinishSound()`), spočítá chyby a zavolá `onQuizFinished({ correctCount, incorrectCount })`.
            7. Metoda `abortQuiz()` pro okamžité přerušení (vyčištění timeru, pauza hudby).
    * **`controllers/quizControllerUI.js`**

        * Přijímá stav z `QuizController` (`onQuizLoaded`, `renderQuestion`) a aktualizuje DOM:

            1. `handleQuizLoaded(data)`: vyčistí `media-container`, nastaví titulek kvízu (`Kvíz: ${data.title}`) a nastaví `progressBarEl.max` na počet otázek. Zobrazí sekci kvízu.
            2. `renderQuestion(state)`:

                * Pokud je nová otázka (`index !== lastIndex`), odstraní staré médium, a pokud otázka obsahuje `question.media`, dynamicky vytvoří `<audio>` nebo `<video>` element s proper controls a URL. Jakmile se načtou metadata, volá se `quizLogic.extendTimer(extraSec)` a prodlouží timer podle délky média.
                * Aktualizuje text otázky, seznam odpovědí (`choicesListEl`). Pro každou odpověď vytvoří `<button>` s `data-index`, aktivuje jej a napojí `onclick` na `quizLogic.selectAnswer(idx)`.
                * Pokud uživatel zvolil odpověď (`selected`) nebo došlo k uplynutí času (`timedOut`), všechna tlačítka se deaktivují a barevně se zvýrazní správné a nesprávné odpovědi (zelená/červená).
                * Nastavuje `timerEl.textContent = `\${timeLeft}s` a bliká barvou, když je čas na minimu (`<= 5s\`).
                * Aktivuje tlačítko „Další“ (`nextBtn.disabled = false`), teprve až je zvolena odpověď nebo došlo k timeoutu.
    * **`controllers/resultsController.js`**

        * Po ukončení kvízu (`onQuizFinished`) zobrazí:

            1. Procentuální / početní hodnocení `Správně: X z Y`.
            2. Volá `drawResultsChart(canvasEl, correctCount, incorrectCount)` z `chartController.js`, která vykreslí kombinovaný sloupcový graf + koláčové rozdělení v `<canvas id="resultsChart">`.
            3. Zobrazí sekci výsledků (`showSection(resultsScreen)`).
    * **`controllers/chartController.js`**

        * Funkce `drawResultsChart(canvasEl, correctCount, incorrectCount)`:

            1. Vypočítá `total = correct + incorrect`. Pokud je `total === 0`, vrací se (žádné vykreslení).
            2. Vykreslí dva sloupce (správných / chybných) v levé polovině canvasu: barvu `#27ae60` pro správné, `#c0392b` pro špatné. Pod každým sloupcem se zobrazí název („Správné“, „Špatné“) a počet.
            3. Vykreslí osu X pod sloupci.
            4. V pravé polovině vykreslí koláčový graf: zakrývá kruh `arc` pro % správných a zbytek pro % chybných. V popředí pak procenta uvnitř pláště koláče bílou barvou.
            5. Nad grafem napíše „Výsledky kvízu“.
    * **`controllers/scoresController.js`**

        * Metoda `show()`:

            1. Získá z `scoreService.getTopScores(10)` seznam nejlepších (největší počet správných; při shodě starší timestamp).
            2. Pokud je prázdný, zobrazí `<li>Žádné výsledky zatím.</li>`, jinak pro každý záznam sestaví `<li>` ve tvaru:

               ```
               {jméno} – {název kvízu} – {correct}/{total} ({formátované datum a čas})
               ```
            3. Zobrazí sekci žebříčku.
    * **`controllers/controlPanelController.js`**

        * Metoda `show()`:

            1. Vyčistí `<ul id="control-panel-list">`.
            2. Načte `getAllCustomQuizzes()` (vrátí pole `{id, name}` z `localStorage`).
            3. Pokud prázdné, zobrazí `<li>Žádné vlastní kvízy.</li>`.
            4. Jinak pro každý vlastní kvíz:

                * Vytvoří `<li>` s koukazem jména kvízu.
                * Přidá tlačítko **Hrát**: spustí `app.startQuiz(id, name)` (zejména zajistí, že je zadáno jméno hráče);
                * Tlačítko **Upravit**: načte `getCustomQuiz(id)` a zavolá `app.showAuthoringEdit(id, raw)` pro předvyplnění formuláře.
                * Tlačítko **Export**: vygeneruje `Blob` z raw JSON, vytvoří dočasný `<a download>` a vyšle ho.
                * Tlačítko **Smazat**: po potvrzení `deleteCustomQuiz(id)`, obnoví seznam vlastních kvízů i hlavní seznam (`homeCtrl.buildQuizList()`).
            5. Zobrazí sekci správy (`showSection(controlPanelScreen)`).
    * **`controllers/authoringController.js` + `authoringHelpers.js`**

        * Řeší vytváření a úpravu vlastních kvízů:

            1. Ve formuláři (`#authoring-form`) je pole pro **Název kvízu** (`<input id="new-quiz-name">`) + kontejner `<div id="questions-container">` pro jednotlivé otázkové bloky.
            2. Tlačítko **Přidat otázku** (`#add-question-btn`) vloží nový blok otázky voláním `addQuestionBlockHTML(qid, questionsContainer, prefill)`.
            3. V `addQuestionBlockHTML` se:

                * Vytvoří `<div class="question-block" data-qid="{qid}">`.
                * Čtyři pole:
                  a) `<textarea>` pro text otázky
                  b) `<input type="text">` pro správnou odpověď
                  c) `<input type="text" placeholder="…">` pro ostatní odpovědi (oddělené čárkami)
                  d) `<input type="file" accept="audio/*,video/*">` pro přidání média (max 5 MB)
                * Pod každým polem `<div class="field-error">` pro zobrazení validace.
                * Pokud je předvyplněný (`prefill`) objekt otázky, tak se vloží již existující text/odpovědi a zároveň, pokud `prefill.media` existuje, vykreslí se `<audio>` nebo `<video>` do `#media-preview-{qid}`.
                * Přidá se tlačítko „✖“ (smazat blok otázky), které při kliknutí smaže rodičovský `<div>`.
            4. Na `#save-quiz-btn` se volá `_saveQuiz()`:

                * Ověří se validita názvu (nejednoho prázdného řetězce, max. délka 30 znaků).
                * Získá se seznam všech vytvořených `.question-block` prvků.
                * `validateAllQuestionBlocks(blocks)` ověří pro každý blok:

                    * Text otázky min. délka 5 znaků.
                    * Správná odpověď nesmí být prázdná.
                    * Ostatní odpovědi min. 2, žádné duplicity, správná odpověď se nemá mezi ostatními.
                    * Formát média (pokud je nahrán) musí být audio nebo video a max velikost 5 MB.
                    * V případě souboru se vytvoří `Promise`, který načte data přes `FileReader` a vrátí `{type: 'audio'|'video', url: dataURL}`.
                    * Pokud blok obsahuje již existující médium (`dataset.mediaUrl`), vrátí se `Promise.resolve({ type, url })`.
                * `Promise.all(mediaPromises)` vrátí pole médií v pořadí bloků.
                * Vytvoří se `rawQuiz = { name: quizName, questions }`, kde `questions` je pole objektů `{ text, right_answer, other_answers, media? }`.
                * `saveCustomQuiz(quizId, rawQuiz)` uloží objekt do `localStorage` pod `'customQuizzes'`.
                * V UI se zobrazí zelená zpráva „Kvíz ‘…’ byl uložen/uvořen“ do `nameErrorDiv` a po 3 sigs se skryje.
                * Provádí se callback `onAuthorSaved()` (v AppControlleru se tím znovu postaví hlavní seznam kvízů).
            5. Tlačítko **Exportovat kvíz** v autoringu (\_exportCurrentQuiz) stáhne soubor `{quizId}.json` z aktualně uloženého `currentRawQuiz`.
            6. **Import**:

                * Z `HomeController` nebo `AuthoringController` se kliknutím na „Importovat kvíz“ otevírá `<input type="file" accept=".json">`.
                * Po vybrání souboru se `handleImportFile(...)` pokusí `JSON.parse` a validuje strukturu (název, otázky, odpovědi, media). V případě chyby ukáže chybovou hlášku `nameErrorDiv`.
                * Vygeneruje se unikátní `quizId` (z názvu souboru + číslo, pokud už existuje).
                * `saveCustomQuiz(quizId, raw)` uloží importovaný kvíz. Zobrazí se zelená zpráva „Kvíz ‘…’ byl importován (ID: …)“.
                * Zavolá se `onSuccess(quizId, raw)` → opět z AppControlleru se znovu postaví domácí seznam.
    * **`dataService.js`**

        * Konstanta `CUSTOM_STORAGE_KEY = 'customQuizzes'`.
        * Pomocné `_getCustomMap()` / `_setCustomMap(mapObj)` pro práci s `localStorage`.
        * `getAllCustomQuizzes()` vrátí pole `{id, name}` z `customQuizzes`.
        * `getCustomQuiz(id)` vrátí objekt quiz pod klíčem `id`.
        * `saveCustomQuiz(id, rawQuiz)`, `deleteCustomQuiz(id)` ukládají/mažou v `localStorage`.
        * `loadQuizData(topic)`:

            1. Zkontroluje, zda `topic` existuje v `customMap` → pokud ano, vrátí `Promise.resolve(_transform(customMap[topic]))`.
            2. Jinak provede `fetch('data/${topic}.json')` a po úspěšném načtení převede JSON na interní formát voláním `_transform(rawData)`.
            3. `_transform(raw)` vytvoří:

                * `data = { title: raw.name, questions: [] }`.
                * Pro každý objekt `q` ve `raw.questions`:

                    * Pokud `q.choices` existuje (vlastní již „převrácené“ kvízy), pak:

                      ```js
                      newQ = { text: q.text, choices: q.choices, answer: q.answer }
                      ```
                    * Jinak (vestavěné) objekt má `right_answer` + `other_answers` → smíchají se (`shuffleArray(allChoices)`) a určí se index správné odpovědi `answer = allChoices.indexOf(right_answer)`.

                      ```js
                      const allChoices = [...q.other_answers, q.right_answer];
                      shuffleArray(allChoices);
                      newQ = { text: q.text, choices: allChoices, answer: indexOfRight };
                      ```
                    * Pokud `q.media` existuje, nechá se přenést do `newQ.media`.
                * Vrátí objekt `{ title, questions: [ … ] }`, připravený pro `QuizController`.
    * **`scoreService.js`**

        * `STORAGE_KEY = 'quizHighScores'`.
        * `getScores()` – načte pole výsledků z `localStorage` (nebo `[]`).
        * `addScore(newEntry)` –

            1. Načte všechna skóre.
            2. Vyhledá, zda již existuje záznam se stejným `name` a `quiz`.
            3. Pokud neexistuje, pushne nový.
            4. Pokud existuje, vypočte procento (`correct/total`) pro nový i starý záznam:

                * Pokud nové % > staré %, nahradí existující novou hodnotou.
                * Pokud stejné % a `newEntry.timestamp < existing.timestamp` (novější skóre stejné kvality dříve), nahradí.
            5. Uloží zpět seřazené/vynášené pole do `localStorage`.
        * `getTopScores(limit)` – seskupí výsledky dle počtu správných sestupně, při shodě starší timestamp ukáže dříve. Vrátí prvních `limit` záznamů.
        * `getRecentScores(limit)` – seřadí sestupně dle timestamp a vrátí TOP `limit`.
    * **`utils.js`**

        * `shuffleArray(arr)` – pro náhodné promíchání polí (Fisher–Yates shuffle).

4. **Offline podpora (Service Worker) – `sw.js`**

    * **Cíle**:

        1. Cacheovat všechny statické assety při instalaci (HTML, CSS, JS, data JSON, media).
        2. Při fetch požadavku nejprve kontrolovat cache, poté síť.
        3. Pokud síť vrátí validní odpověď (`status === 200`), uložit ji zpět do cache pro příště.
        4. Obsluha aktivace: smazat staré cache verze (klíče neodpovídají `CACHE_NAME`).
    * **Hlavní části**:

      ```js
      const CACHE_NAME = 'geo-quiz-v1';
      const ASSETS_TO_CACHE = [
        '/', '/index.html',
        '/css/styles.css',
        '/js/app.js', '/js/audioController.js', …,
        '/data/afrika.json', …, '/data/stredni-amerika.json',
        '/media/background-music.mp3', '/media/finish-sound.mp3'
      ];
      // Instalace: caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
      // Aktivace: lot of caches.keys() … delete old caches
      // Fetch: caches.match(request) → pokud najde, vrátí; jinak fetch z network → pokud valid, do cache → vrátí
      ```
    * Tím je zajištěno, že i při přerušení internetu budou dostupné všechny vestavěné kvízy, styly a skripty.

5. **Testování a doladění**

    * **Funkční testy** v prohlížeči:

        * Ověření, že po zadání jména povolí tlačítka s kvízy.
        * Průběh kvízu: zobrazí se otázka, odpočítává čas, odpovědi se míchají, přehrává se hudba, přidá se extra čas podle délky media.
        * Při výběru odpovědi se zvýrazní správná / špatná, zobrazí se tlačítko Další, pak se přechází na další otázku.
        * Na konci se uloží skóre a zobrazí se sloupcový + koláčový graf.
    * **Testy pro vytváření vlastních kvízů**:

        * Uložení bez media (minimálně 1 otázka).
        * Přidání audio / video, správné načtení a prodloužení času.
        * Export i import JSON: validace struktury, chybové hlášky (prázdné texty, duplicity, chybné URL média).
    * **Žebříček**:

        * Po splnění kvízu se v `localStorage['quizHighScores']` objeví nový záznam, a ve výpisu v `#scores-screen` se zobrazí.
    * **Správa vlastních kvízů** (Control Panel):

        * Seznam uživatelových kvízů, možnost hrát, upravit, exportovat i smazat.
    * **Responzivita**:

        * Testování v různých šířkách: < 768px, < 480px. Kontrola, že se menu správně přeuspořádá, tlačítka se přizpůsobí.

## Popis funkčnosti

### 1. Home / Výběr kvízu

* Po otevření aplikace se uživateli zobrazí obrazovka s nápisem „Vyberte kvíz“ a text „Otestujte své znalosti zeměpisu“.
* Hned pod titulkem je pole pro zadání jména nebo iniciálů (max 10 znaků). Dokud není zadáno, tlačítka pro spuštění kvízů jsou deaktivována a vyskakuje červená hláška „Prosím, zadejte své jméno nebo iniciály.“
* Pod tím jsou dvě tlačítka:

    1. **➕ Vytvořit kvíz** – přesměruje na obrazovku Authoring (prázdný formulář pro vytvoření vlastního kvízu).
    2. **📁 Importovat kvíz** – otevře dialog pro výběr JSON souboru. Po úspěšném importu se vlastní kvíz automaticky přidá do seznamu vlastních kvízů a zobrazí se potvrzující zpráva.
* Pod ovládacími tlačítky je seznam tlačítek „Vestavěné kvízy“:

    * **Afrika**, **Evropa**, **Česká republika**, **Austrálie a Nový Zéland**, **Jižní Amerika**, **Střední Amerika**, **Kanada a USA**
      Každé tlačítko je aktivní, pokud uživatel zadal jméno. Po kliknutí se spustí kvíz dané kategorie.
* Pokud má uživatel uložené vlastní kvízy, za oddělovačem (`<hr>`) se zobrazí seznam vlastních (label „Název (vlastní)“). Princip spuštění je stejný jako u vestavěných.

### 2. Quiz Screen / Průběh kvízu

* Po spuštění kvízu:

    1. Zobrazí se barva pozadí a horní část obrazovky se přepne na „Kvíz: Název kvízu“.
    2. Nadpis kvízu je doplněný „Otázka X / Y“ (zobrazuje se také progress bar `<progress>`), pod kterým je červené tlačítko-štítek `timer` ukazující kolik sekund zbývá (odpočítává od 15 s). 
    3. Pokud otázka obsahuje audio/video, v horní části nad textem otázky se objeví přehrávač (`<audio controls>` nebo `<video controls>`). Jakmile se načte metadata média, timer se prodlouží o délku média (např. +8 s, +12 s).
    4. Pod tím se zobrazí text otázky (`<p id="question-text">`) a seznam možných odpovědí (`<ul id="choices-list">`). Odpovědi jsou prezentovány jako `<button>`. Jejich pořadí je náhodné (míchání) pro zabudované kvízy.
    5. Jakmile hráč klikne na odpověď, okamžitě se ukončí odpočet (`clearInterval`). Vybraný button se zbarví zeleně, pokud je odpověď správná, nebo červeně, pokud je špatná; navíc se zvýrazní i správná odpověď, pokud hráč zvolil špatně. Všechna tlačítka odpovědí se deaktivují.
    6. Odtud uživatel musí kliknout na tlačítko **Další** (`#next-btn`) ve spodním footeru, aby se aplikace posunula na další otázku.
    7. Pokud timer dosáhne nuly, system automaticky označí odpověď jako chybnou (volá `QuizController._autoSkip()`) a umožní přechod dál. Tlačítka klikatelná nejsou, protože otázka už prošla timeoutem.

### 3. Results Screen / Zobrazení výsledků

* Jakmile proběhnou všechny otázky:

    1. Hudba se zastaví a hraje se krátký oznamovací tón (`finish-sound.mp3`).
    2. Aplikace spočítá počet správných / nesprávných odpovědí a do `scoreService` uloží nový záznam (`{ name, quiz, correct, total, timestamp }`). Pokud už jméno+quiz existuje, porovná se procento a případně se nahradí lepší skóre.
    3. Přejde se na sekci „Výsledky“.
* V sekci „🎉 Výsledky“:

    * Nadpis: **Výsledky**
    * Pod ním zobrazí text: `Správně: X z Y`.
    * Pod tím je `<canvas id="resultsChart">` s vykresleným grafem:

        1. Vlevo sloupcový graf, kde jeden sloupec ukazuje počet správných, druhý počet špatných (s popisky a osou).
        2. Vpravo koláčový graf, kde vnitřní texty ukazují procenta správných a chybných.
        3. Nad celým grafem je nápis „Výsledky kvízu“ (vykresleno z JavaScriptu).
    * V dolním footeru je tlačítko **Zpět na domovskou**, které ukončí kvíz (`quizLogic.abortQuiz()`) a přenese na Home.

### 4. Scores Screen / Žebříček

* V navigaci (horní menu) lze kliknout na tlačítko „🏆 Žebříček“ kdykoliv.
* Sekce „🏆 Žebříček“:

    * Pokud nejsou žádné záznamy, zobrazí `<li>Žádné výsledky zatím.</li>`.
    * Jinak se vyčte z `scoreService.getTopScores(10)` nejlepších 10 záznamů podle:

        1. Počet správných (sestupně).
        2. Při shodě vyšší počet zobrazen dříve (nižší timestamp).
    * Každý záznam se vypíše ve formátu:

      ```
      Jméno – Název kvízu – Správně/Počet (DD.MM.RRRR, HH:MM:SS)
      ```
    * V dolním footeru tlačítko **Zpět na domovskou** (stejně jako u Results).

### 5. Control Panel / Správa vlastních kvízů

* Kliknutím na „⚙️ Spravovat“ v navigační liště se uživatel dostane na obrazovku správy vlastních kvízů.
* Sekce „⚙️ Správa vlastních kvízů“:

    * Vypíše se `<ul id="control-panel-list">`:

        * Pokud nejsou žádné vlastní kvízy, zobrazí se `<li>Žádné vlastní kvízy.</li>`.
        * Jinak pro každý kvíz (`{id, name}` z `dataService.getAllCustomQuizzes()`):

            1. **Název kvízu** (řetězec)
            2. Tlačítko **Hrát**: po kliknutí se spustí kvíz daného ID (po ověření jména hráče).
            3. Tlačítko **Upravit**: načtou se existující data kvízu `getCustomQuiz(id)` a vytvoří se předvyplněný formulář v Authoring sekci (`app.showAuthoringEdit(id, raw)`).
            4. Tlačítko **Export**: stáhne se JSON soubor `{id}.json` s kompletní strukturou (název + otázky + media data jako data-URL).
            5. Tlačítko **Smazat**: vyžádá potvrzení, poté `deleteCustomQuiz(id)`, obnoví seznam (volá `this.show()` i `app.homeCtrl.buildQuizList()`).
    * V dolním footeru tlačítko **Zpět na domovskou**.

### 6. Authoring Screen / Vytváření a editace kvízů

* Sekce „✏️ Vytvořit / Upravit kvíz“ obsahuje:

    * **Název kvízu** – textové pole (`<input id="new-quiz-name">`, max 30 znaků).
    * Pod ním `<div id="questions-container">` – sem se dynamicky vkládají bloky jednotlivých otázek.
    * Pod tím dva řádky tlačítek:

        1. **➕ Přidat otázku** (`#add-question-btn`) – přidá nový blok pro zadání otázky (text, správná odpověď, ostatní odpovědi, volba média).
        2. V řádce **Uložit / Exportovat**:

            * **💾 Uložit kvíz** (`#save-quiz-btn`) – validuje všechna pole; pokud je vše v pořádku, uloží do `localStorage` a zobrazí dočasnou zelenou hlášku „Kvíz … byl uložen.“.
            * **📤 Exportovat kvíz** (`#export-quiz-btn`) – vygeneruje JSON soubor a stáhne jej, ale pouze pokud už kvíz byl dříve uložen.
    * Pod tím tlačítko **Zpět na domovskou** (`#authoring-home-btn`), které se vrací pomocí `history.back()`.
* **Blok otázky** (`.question-block`) obsahuje:

    1. **Nadpis**: „Otázka {qid}“ + tlačítko ✖ pro smazání bloku.
    2. **Textarea** pro text otázky (min 5 znaků).
    3. **Input** pro správnou odpověď (nutné vyplnit).
    4. **Input** pro ostatní odpovědi (šablona „odp. A, odp. B“; min. 2, oddělené čárkami, bez duplicit).
    5. **Media preview** (`<div id="media-preview-{qid}">`) pro zobrazení stávajícího media (pouze při editaci).
    6. **Input type=file** pro volbu nového média (audio/video, max 5 MB). Pokud je nahráno, v metodě validace se vytvoří `FileReader` a převede na Data URL, kterou se uloží do JSON.
    7. Pod každým polem `<div class="field-error" id="{pole}-error-{qid}">` pro zobrazení příslušné chybové hlášky (např. prázdný text, duplicitní odpovědi, špatný formát média).
* **Validace**:

    * `validateQuizName(quizName)` – název v rozsahu 1–30 znaků.
    * `validateAllQuestionBlocks(blocks)`:

        1. `textVal.trim().length >= 5`
        2. `correctVal.trim() !== ''`
        3. `otherAnswers.split(',')` musí mít nejméně 2 ne-prázdné položky, žádné duplicity, a nesmí obsahovat `correctVal`.
        4. Pokud je přiložen soubor, validovat `file.type` na `audio/*` nebo `video/*` a `file.size <= 5 * 1024 * 1024`.
        5. Pro každý blok se připraví promise pro načtení média (nebo vrací existující data z `dataset.mediaUrl`).
    * Pokud se objeví jakákoli chyba, zobrazí se do příslušného `#*-error-{qid}` divu a *celý* save se přeruší.
* **Ukládání** (`_saveQuiz()`):

    1. Zkontroluje se, zda existuje `currentQuizId` (editujeme existující kvíz) nebo se vytvoří nové ID generované z názvu (převod na malá písmena, nahrazení mezer „-“, odstranění speciálních znaků, případně přidání číslového suffixu, pokud už ID existuje).
    2. S pomocí `assembleQuestionsArray(blocks, mediaArray)` vytvoří finální pole `questions` s objekty:

       ```js
       {
         text: 'Text otázky',
         right_answer: 'Správná odpověď',
         other_answers: ['Odpověď 1', 'Odpověď 2'],
         media: { type: 'audio'|'video', url: 'data:…' }  // volitelné
       }
       ```
    3. Celý objekt `rawQuiz = { name: quizName, questions }` se uloží `saveCustomQuiz(id, rawQuiz)` do `localStorage`.
    4. Zobrazí se zelená hláška, zavolá se `onAuthorSaved()` (v AppControlleru se pak obnoví seznam kvízů v home).
* **Export** (`_exportCurrentQuiz()`):

    * Pokud `currentRawQuiz` a `currentQuizId` existují, vytvoří se `Blob` z `JSON.stringify(currentRawQuiz, null, 2)` a spustí se stahování souboru `"{quizId}.json"`.
* **Import** (`_handleFileImport(event)`) – viz výše.

## Přehled projektu (souborová struktura)

<details>
<summary>Kliknutím rozbalte strom projektu</summary>

```
project-root/
├── .gitignore
├── README.md             ← dokumentace (toto)
├── css/
│   └── styles.css        ← všechny styly aplikace
├── data/
│   ├── afrika.json
│   ├── australie-novy-zeland.json
│   ├── ceska-republika.json
│   ├── evropa.json
│   ├── jizni-amerika.json
│   ├── kanada-usa.json
│   └── stredni-amerika.json
├── index.html            ← hlavní HTML kostra
├── js/
│   ├── app.js            ← vstupní bod: registrace SW + AppController
│   ├── controllers/
│   │   ├── appController.js         ← hlavní orchestrátor sekcí + historie
│   │   ├── audioController.js       ← přehrávání a mute hudby / efektů
│   │   ├── authoringController.js   ← správa ukládání / editace vlastních kvízů
│   │   ├── authoringHelpers.js      ← generování HTML bloků pro otázky, validace
│   │   ├── chartController.js       ← vykreslení sloupcového + koláčového grafu
│   │   ├── controlPanelController.js← správa existujících vlastních kvízů
│   │   ├── homeController.js        ← domovská obrazovka (výběr kvízu)
│   │   ├── quizController.js        ← logika průběhu kvízu (timer, odpovědi)
│   │   ├── quizControllerUI.js      ← aktualizace UI (zobrazení otázky, timer, tlačítka)
│   │   ├── resultsController.js     ← zobrazení výsledků + graf
│   │   └── scoresController.js      ← zobrazení žebříčku
│   ├── dataService.js     ← načítání/filtrování vestavěných + vlastních kvízů
│   ├── scoreService.js    ← ukládání/řazení výsledků do LocalStorage
│   └── utils.js           ← pomocné funkce (shuffleArray)
├── media/
│   ├── background-music.mp3    ← hudba během kvízu
│   └── finish-sound.mp3        ← zvuk na konci kvízu
└── sw.js                ← Service Worker pro offline cache

```

</details>

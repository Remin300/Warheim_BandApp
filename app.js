"use strict";

/* =========================================
   1. KONFIGURACJA I DANE
========================================= */

const STORAGE_KEY = "battleRosterData";

let appData = {
    version: 1,
    rozpiski: []
};

let selectedRosterId = null;
let selectedUnitId = null;
let editingUnitDraft = null;

const STAT_DEFINITIONS = [
    { key: "ww", label: "WW", name: "Walka wręcz" },
    { key: "us", label: "US", name: "Umiejętności strzeleckie" },
    { key: "sz", label: "Sz", name: "Szybkość" },
    { key: "s", label: "S", name: "Siła" },
    { key: "wt", label: "Wt", name: "Wytrzymałość" },
    { key: "zw", label: "Żw", name: "Żywotność" },
    { key: "i", label: "I", name: "Inicjatywa" },
    { key: "a", label: "A", name: "Ataki" },
    { key: "cp", label: "CP", name: "Cechy przywódcze" }
];


/* =========================================
   2. NORMALIZACJA DANYCH
========================================= */

function ensureUnitStats(unit) {
    if (!unit.statystyki || typeof unit.statystyki !== "object") {
        unit.statystyki = {};
    }

    STAT_DEFINITIONS.forEach(stat => {
        if (
            !unit.statystyki[stat.key] ||
            typeof unit.statystyki[stat.key] !== "object"
        ) {
            unit.statystyki[stat.key] = {};
        }

        const values = unit.statystyki[stat.key];

        if (!Number.isFinite(values.obecne)) {
            values.obecne = 0;
        }

        if (!Number.isFinite(values.maksymalne)) {
            values.maksymalne = values.obecne;
        }
    });
}


function normalizeData(data) {
    if (!Array.isArray(data.rozpiski)) {
        throw new Error("Nieprawidłowa struktura danych.");
    }

    data.rozpiski.forEach(roster => {
        if (!Array.isArray(roster.jednostki)) {
            roster.jednostki = [];
        }

        roster.jednostki.forEach(unit => {
            ensureUnitStats(unit);

            if (!Array.isArray(unit.przedmioty)) {
                unit.przedmioty = [];
            }

            if (!Array.isArray(unit.zdolnosci)) {
                unit.zdolnosci = [];
            }

            unit.przedmioty.forEach(item => {
                item.zasieg = String(item.zasieg ?? "");
                item.sila = String(item.sila ?? "");
                item.opis = String(item.opis ?? "");
            });
        });
    });

    return data;
}


/* =========================================
   3. FUNKCJE POMOCNICZE
========================================= */

function generateId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).substring(2);
}


function findRoster(rosterId = selectedRosterId) {
    return appData.rozpiski.find(
        roster => roster.id === rosterId
    );
}


function findUnit(unitId = selectedUnitId) {
    const roster = findRoster();

    if (!roster) return null;

    return roster.jednostki.find(
        unit => unit.id === unitId
    );
}


function getNumberInput(message, defaultValue = 0) {
    const value = prompt(message, defaultValue);

    if (value === null) return null;

    const normalizedValue = value.trim().replace(",", ".");

    if (normalizedValue === "") {
        alert("Wprowadź wartość liczbową.");
        return getNumberInput(message, defaultValue);
    }

    const number = Number(normalizedValue);

    if (!Number.isFinite(number) || number < 0) {
        alert("Wprowadź poprawną liczbę nieujemną.");
        return getNumberInput(message, defaultValue);
    }

    return number;
}


function getTextInput(message, defaultValue = "") {
    const value = prompt(message, defaultValue);

    if (value === null) return null;

    if (!value.trim()) {
        alert("To pole nie może być puste.");
        return getTextInput(message, defaultValue);
    }

    return value.trim();
}


function calculateUnitCost(unit) {
    const itemsCost = unit.przedmioty.reduce(
        (sum, item) => sum + item.koszt,
        0
    );

    const skillsCost = unit.zdolnosci.reduce(
        (sum, skill) => sum + skill.koszt,
        0
    );

    return unit.koszt + itemsCost + skillsCost;
}


function calculateRosterCost(roster) {
    return roster.jednostki.reduce(
        (sum, unit) => sum + calculateUnitCost(unit),
        0
    );
}


/* =========================================
   4. ZAPIS I ODCZYT DANYCH
========================================= */

function saveToLocalStorage() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(appData)
        );
    } catch (error) {
        console.error("Błąd zapisu danych:", error);
        alert("Nie udało się zapisać danych w przeglądarce.");
    }
}


function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) return;

        const parsedData = JSON.parse(savedData);

        if (
            parsedData.version !== 1 ||
            !Array.isArray(parsedData.rozpiski)
        ) {
            throw new Error("Nieprawidłowa struktura danych.");
        }

        appData = normalizeData(parsedData);

    } catch (error) {
        console.error("Błąd odczytu danych:", error);
        alert("Nie udało się odczytać zapisanych danych.");
    }
}


function persistAndRender() {
    saveToLocalStorage();
    renderApp();
}


/* =========================================
   5. RENDEROWANIE APLIKACJI
========================================= */

function renderApp() {
    renderRosters();
    renderRosterDetails();
    renderUnits();
    renderUnitEditor();
}


function renderRosters() {
    const container = document.getElementById("rostersList");

    container.innerHTML = "";

    appData.rozpiski.forEach(roster => {
        const card = document.createElement("div");

        card.className = "roster-card";

        if (roster.id === selectedRosterId) {
            card.classList.add("active");
        }

        const name = document.createElement("h3");
        name.textContent = roster.nazwa;

        const info = document.createElement("span");
        info.textContent = `${roster.jednostki.length} jednostek`;

        card.append(name, info);

        card.addEventListener("click", () => {
            selectedRosterId = roster.id;
            selectedUnitId = null;
            editingUnitDraft = null;

            renderApp();
        });

        container.appendChild(card);
    });
}


function renderRosterDetails() {
    const roster = findRoster();

    const name = document.getElementById("rosterName");
    const count = document.getElementById("rosterUnitCount");
    const totalCost = document.getElementById("rosterTotalCost");
    const totalUnits = document.getElementById("rosterTotalUnits");

    const hasRoster = !!roster;

    document.getElementById("btnEditRoster").disabled = !hasRoster;
    document.getElementById("btnDeleteRoster").disabled = !hasRoster;
    document.getElementById("btnAddUnit").disabled = !hasRoster;

    if (!roster) {
        name.textContent = "Wybierz rozpiskę";
        count.textContent = "Brak jednostek";
        totalCost.textContent = "0 pkt";
        totalUnits.textContent = "0";
        return;
    }

    name.textContent = roster.nazwa;
    count.textContent = `${roster.jednostki.length} jednostek`;
    totalCost.textContent = `${calculateRosterCost(roster)} pkt`;
    totalUnits.textContent = roster.jednostki.length;
}


function renderUnits() {
    const container = document.getElementById("unitsList");

    container.innerHTML = "";

    const roster = findRoster();

    if (!roster) return;

    const template = document.getElementById("unitTemplate");

    roster.jednostki.forEach(unit => {
        const card = template.content.firstElementChild.cloneNode(true);

        if (unit.id === selectedUnitId) {
            card.classList.add("selected");
        }

        card.querySelector(".unit-card-name").textContent = unit.nazwa;

        card.querySelector(".unit-card-cost").textContent =
            `${calculateUnitCost(unit)} pkt`;

        card.addEventListener("click", () => {
            selectedUnitId = unit.id;
            editingUnitDraft = null;
            renderApp();
        });

        container.appendChild(card);
    });
}

// mienimalizowanie paneli
const btnMinimalizuj = document.getElementById("btnMinimalizuj");
const rostersPanel = document.querySelector(".rosters-panel");
const appContainer = document.querySelector(".app-container");
const rosterDetail = document.querySelector(".roster-details");


btnMinimalizuj.addEventListener("click", () => {
    rostersPanel.classList.toggle("minimized");
    appContainer.classList.toggle("minimized");
    rosterDetail.classList.toggle("minimized");
});

/* =========================================
   6. EDYTOR JEDNOSTKI
========================================= */

function updateUnitDraftFromInputs() {
    if (!editingUnitDraft) return;

    editingUnitDraft.nazwa =
        document.getElementById("unitName").value;

    editingUnitDraft.koszt =
        Number(document.getElementById("unitCost").value);

    STAT_DEFINITIONS.forEach(stat => {
        const currentInput = document.getElementById(
            `unit${stat.key.toUpperCase()}Current`
        );

        const maxInput = document.getElementById(
            `unit${stat.key.toUpperCase()}Max`
        );

        editingUnitDraft.statystyki[stat.key].obecne =
            Number(currentInput.value);

        editingUnitDraft.statystyki[stat.key].maksymalne =
            Number(maxInput.value);
    });
}


function renderUnitEditor() {
    const editor = document.getElementById("unitEditor");
    const unit = findUnit();

    editor.style.display = unit ? "block" : "none";

    if (!unit) return;

    ensureUnitStats(unit);

    const isEditing = editingUnitDraft !== null;

    document.getElementById("btnEditUnit").hidden = isEditing;
    document.getElementById("btnDeleteUnit").hidden = isEditing;

    document.getElementById("btnSaveUnitChanges").hidden = !isEditing;
    document.getElementById("btnCancelUnitChanges").hidden = !isEditing;

    document.getElementById("btnAddItem").hidden = !isEditing;
    document.getElementById("btnAddSkill").hidden = !isEditing;

    document.getElementById("unitName").hidden = !isEditing;
    document.getElementById("unitCost").hidden = !isEditing;

    document.getElementById("unitNameLabel").hidden = !isEditing;
    document.getElementById("unitCostLabel").hidden = !isEditing;

    document.getElementById("unitMaxStats").hidden = !isEditing;
    document.getElementById("unitStatsH3").hidden = !isEditing;
    document.getElementById("unitStatsIbecneH4").hidden = !isEditing;

    const displayedUnit = isEditing ? editingUnitDraft : unit;

    document.getElementById("unitEditorTitle").textContent =
        displayedUnit.nazwa;

    document.getElementById("unitName").value =
        displayedUnit.nazwa;

    document.getElementById("unitCost").value =
        displayedUnit.koszt;

    STAT_DEFINITIONS.forEach(stat => {
        document.getElementById(
            `unit${stat.key.toUpperCase()}Current`
        ).value = displayedUnit.statystyki[stat.key].obecne;

        document.getElementById(
            `unit${stat.key.toUpperCase()}Max`
        ).value = displayedUnit.statystyki[stat.key].maksymalne;
    });

    setUnitFieldsEditable(isEditing);

    renderItems(displayedUnit);
    renderSkills(displayedUnit);
}


function setUnitFieldsEditable(editable) {
    const fields = [
        "unitName",
        "unitCost",
        ...STAT_DEFINITIONS.flatMap(stat => [
            `unit${stat.key.toUpperCase()}Current`,
            `unit${stat.key.toUpperCase()}Max`
        ])
    ];

    fields.forEach(id => {
        const element = document.getElementById(id);

        if (!element) {
            console.warn(`Nie znaleziono pola: ${id}`);
            return;
        }

        element.disabled = !editable;
        element.readOnly = !editable;
    });
}


/* =========================================
   7. ROZPISKI
========================================= */

function addRoster() {
    const name = getTextInput("Podaj nazwę nowej rozpiski:");

    if (name === null) return;

    const roster = {
        id: generateId(),
        nazwa: name,
        jednostki: []
    };

    appData.rozpiski.push(roster);

    selectedRosterId = roster.id;
    selectedUnitId = null;
    editingUnitDraft = null;

    persistAndRender();
}


function editRoster() {
    const roster = findRoster();

    if (!roster) return;

    const newName = getTextInput(
        "Podaj nową nazwę rozpiski:",
        roster.nazwa
    );

    if (newName === null) return;

    roster.nazwa = newName;

    persistAndRender();
}


function deleteRoster() { 
    const roster = findRoster();

    if (!roster) return;

    const confirmed = confirm(
        `Czy na pewno usunąć rozpiskę "${roster.nazwa}" wraz ze wszystkimi jednostkami?`
    );

    if (!confirmed) return;

    appData.rozpiski = appData.rozpiski.filter(
        item => item.id !== roster.id
    );

    selectedRosterId = null;
    selectedUnitId = null;
    editingUnitDraft = null;

    persistAndRender();
}


/* =========================================
   8. JEDNOSTKI
========================================= */

function addUnit() {
    const roster = findRoster();

    if (!roster) return;

    const statystyki = {};

    for (const stat of STAT_DEFINITIONS) {
        statystyki[stat.key] = {
            obecne: 0,
            maksymalne: 0
        };
    }

    const unit = {
        id: generateId(),
        nazwa: "",
        koszt: 0,
        statystyki,
        przedmioty: [],
        zdolnosci: []
    };

    roster.jednostki.push(unit);

    selectedUnitId = unit.id;
    editingUnitDraft = null;

    persistAndRender();
}
function editUnit() {
    const unit = findUnit();

    if (!unit) return;

    editingUnitDraft = JSON.parse(JSON.stringify(unit));

    ensureUnitStats(editingUnitDraft);

    renderUnitEditor();
}


function saveUnitChanges() {
    if (!editingUnitDraft) return;

    updateUnitDraftFromInputs();

    if (!editingUnitDraft.nazwa.trim()) {
        alert("Nazwa jednostki nie może być pusta.");
        return;
    }

    const values = [
        editingUnitDraft.koszt,
        ...STAT_DEFINITIONS.flatMap(stat => [
            editingUnitDraft.statystyki[stat.key].obecne,
            editingUnitDraft.statystyki[stat.key].maksymalne
        ])
    ];

    if (values.some(value => !Number.isFinite(value) || value < 0)) {
        alert("Wprowadzone wartości muszą być poprawnymi liczbami nieujemnymi.");
        return;
    }

    const invalidStat = STAT_DEFINITIONS.find(stat => {
        const statValues = editingUnitDraft.statystyki[stat.key];

        return statValues.obecne > statValues.maksymalne;
    });

    if (invalidStat) {
        alert(
            `Statystyka ${invalidStat.label}: wartość obecna nie może być większa od maksymalnej.`
        );
        return;
    }

    const invalidItem = editingUnitDraft.przedmioty.find(item =>
        !Number.isFinite(item.koszt) || item.koszt < 0
    );

    if (invalidItem) {
        alert("Koszt przedmiotu musi być poprawną liczbą nieujemną.");
        return;
    }

    const invalidSkill = editingUnitDraft.zdolnosci.find(skill =>
        !Number.isFinite(skill.koszt) || skill.koszt < 0
    );

    if (invalidSkill) {
        alert("Koszt zdolności musi być poprawną liczbą nieujemną.");
        return;
    }

    const unit = findUnit();

    if (!unit) return;

    Object.assign(unit, editingUnitDraft);

    editingUnitDraft = null;

    persistAndRender();
}


function cancelUnitChanges() {
    if (!editingUnitDraft) return;

    editingUnitDraft = null;

    renderUnitEditor();
}


function deleteUnit() {
    const roster = findRoster();
    const unit = findUnit();

    if (!roster || !unit) return;

    if (!confirm(`Czy usunąć jednostkę "${unit.nazwa}"?`)) {
        return;
    }

    roster.jednostki = roster.jednostki.filter(
        item => item.id !== unit.id
    );

    selectedUnitId = null;
    editingUnitDraft = null;

    persistAndRender();
}


/* =========================================
   9. PRZEDMIOTY
========================================= */

function renderItems(unit) {
    const list = document.getElementById("unitItemsList");
    const template = document.getElementById("itemTemplate");

    list.innerHTML = "";

    const isEditing = editingUnitDraft !== null;

    unit.przedmioty.forEach(item => {
        const clone = template.content.firstElementChild.cloneNode(true);

        const nameElement = clone.querySelector(".item-name");
        const costElement = clone.querySelector(".item-cost");
        const rangeElement = clone.querySelector(".item-range");
        const strengthElement = clone.querySelector(".item-strength");
        const descriptionElement = clone.querySelector(".item-description");

        if (isEditing) {
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = nameElement.className;
            nameInput.placeholder = "Nazwa przedmiotu";
            nameInput.value = item.nazwa ?? "";

            nameInput.addEventListener("input", () => {
                item.nazwa = nameInput.value;
            });

            nameElement.replaceWith(nameInput);

            const costInput = document.createElement("input");
            costInput.type = "number";
            costInput.className = costElement.className;
            costInput.placeholder = "Koszt";
            costInput.value = item.koszt ?? 0;

            costInput.addEventListener("input", () => {
                item.koszt = Number(costInput.value);
            });

            costElement.replaceWith(costInput);

            const rangeInput = document.createElement("input");
            rangeInput.type = "text";
            rangeInput.className = rangeElement.className;
            rangeInput.value = item.zasieg ?? "";

            rangeInput.addEventListener("input", () => {
                item.zasieg = rangeInput.value;
            });

            rangeElement.replaceWith(rangeInput);

            const strengthInput = document.createElement("input");
            strengthInput.type = "text";
            strengthInput.className = strengthElement.className;
            strengthInput.value = item.sila ?? "";

            strengthInput.addEventListener("input", () => {
                item.sila = strengthInput.value;
            });

            strengthElement.replaceWith(strengthInput);

            const descriptionInput = document.createElement("textarea");
            descriptionInput.className = descriptionElement.className;
            descriptionInput.placeholder = "Opis przedmiotu";
            descriptionInput.value = item.opis ?? "";

            descriptionInput.addEventListener("input", () => {
                item.opis = descriptionInput.value;
            });

            descriptionElement.replaceWith(descriptionInput);

        } else {
            nameElement.textContent = item.nazwa ?? "";
            costElement.textContent = `${item.koszt ?? 0} pkt`;
            rangeElement.textContent = item.zasieg ?? "";
            strengthElement.textContent = item.sila ?? "";
            descriptionElement.textContent = item.opis ?? "";
        }

        list.appendChild(clone);
    });
}


function addItem() {
    if (!editingUnitDraft) return;

    const newItem = {
        id: generateId(),
        nazwa: "",
        koszt: 0,
        zasieg: "",
        sila: "",
        opis: ""
    };

    editingUnitDraft.przedmioty.push(newItem);

    renderItems(editingUnitDraft);
}


function editItem(itemId) {
    const unit = findUnit();

    if (!unit) return;

    const item = unit.przedmioty.find(
        item => item.id === itemId
    );

    if (!item) return;

    const name = getTextInput("Nazwa:", item.nazwa);
    if (name === null) return;

    const cost = getNumberInput("Koszt:", item.koszt);
    if (cost === null) return;

    const range = prompt("Zasięg:", item.zasieg);
    if (range === null) return;

    const strength = prompt("Siła:", item.sila);
    if (strength === null) return;

    const description = prompt("Opis:", item.opis);
    if (description === null) return;

    item.nazwa = name;
    item.koszt = cost;
    item.zasieg = range.trim();
    item.sila = strength.trim();
    item.opis = description.trim();

    persistAndRender();
}


function deleteItem(itemId) {
    const unit = findUnit();

    if (!unit) return;

    const item = unit.przedmioty.find(
        item => item.id === itemId
    );

    if (!item) return;

    if (!confirm(`Usunąć przedmiot "${item.nazwa}"?`)) {
        return;
    }

    unit.przedmioty = unit.przedmioty.filter(
        item => item.id !== itemId
    );

    persistAndRender();
}


/* =========================================
   10. ZDOLNOŚCI
========================================= */

function renderSkills(unit) {
    const list = document.getElementById("unitSkillsList");
    const template = document.getElementById("skillTemplate");

    list.innerHTML = "";

    const isEditing = editingUnitDraft !== null;

    unit.zdolnosci.forEach(skill => {
        const clone = template.content.firstElementChild.cloneNode(true);

        const nameElement = clone.querySelector(".skill-name");
        const costElement = clone.querySelector(".skill-cost");
        const descriptionElement = clone.querySelector(".skill-description");

        if (isEditing) {
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = nameElement.className;
            nameInput.placeholder = "Nazwa zdolności";
            nameInput.value = skill.nazwa ?? "";

            nameInput.addEventListener("input", () => {
                skill.nazwa = nameInput.value;
            });

            nameElement.replaceWith(nameInput);

            const costInput = document.createElement("input");
            costInput.type = "number";
            costInput.className = costElement.className;
            costInput.placeholder = "Koszt";
            costInput.value = skill.koszt ?? 0;

            costInput.addEventListener("input", () => {
                skill.koszt = Number(costInput.value);
            });

            costElement.replaceWith(costInput);

            const descriptionInput = document.createElement("textarea");
            descriptionInput.className = descriptionElement.className;
            descriptionInput.placeholder = "Opis zdolności";
            descriptionInput.value = skill.opis ?? "";

            descriptionInput.addEventListener("input", () => {
                skill.opis = descriptionInput.value;
            });

            descriptionElement.replaceWith(descriptionInput);

        } else {
            nameElement.textContent = skill.nazwa ?? "";
            costElement.textContent = `${skill.koszt ?? 0} pkt`;
            descriptionElement.textContent = skill.opis ?? "";
        }

        list.appendChild(clone);
    });
}


function addSkill() {
    if (!editingUnitDraft) return;

    const newSkill = {
        id: generateId(),
        nazwa: "",
        koszt: 0,
        opis: ""
    };

    editingUnitDraft.zdolnosci.push(newSkill);

    renderSkills(editingUnitDraft);
}


function editSkill(skillId) {
    const unit = findUnit();

    if (!unit) return;

    const skill = unit.zdolnosci.find(
        item => item.id === skillId
    );

    if (!skill) return;

    const name = getTextInput("Nazwa zdolności:", skill.nazwa);
    if (name === null) return;

    const cost = getNumberInput("Koszt:", skill.koszt);
    if (cost === null) return;

    const description = prompt("Opis:", skill.opis);
    if (description === null) return;

    skill.nazwa = name;
    skill.koszt = cost;
    skill.opis = description.trim();

    persistAndRender();
}


function deleteSkill(skillId) {
    const unit = findUnit();

    if (!unit) return;

    const skill = unit.zdolnosci.find(
        item => item.id === skillId
    );

    if (!skill) return;

    if (!confirm(`Usunąć zdolność "${skill.nazwa}"?`)) {
        return;
    }

    unit.zdolnosci = unit.zdolnosci.filter(
        item => item.id !== skillId
    );

    persistAndRender();
}


/* =========================================
   11. IMPORT JSON
========================================= */

function validateImportedData(data) {
    if (
        !data ||
        data.version !== 1 ||
        !Array.isArray(data.rozpiski)
    ) {
        throw new Error("Nieprawidłowa struktura pliku JSON.");
    }

    const rosterIds = new Set();

    for (const roster of data.rozpiski) {
        if (
            !roster ||
            typeof roster.id !== "string" ||
            typeof roster.nazwa !== "string" ||
            !Array.isArray(roster.jednostki)
        ) {
            throw new Error("Nieprawidłowa rozpiska.");
        }

        if (rosterIds.has(roster.id)) {
            throw new Error("Powtarzające się ID rozpiski.");
        }

        rosterIds.add(roster.id);

        const unitIds = new Set();

        for (const unit of roster.jednostki) {
            if (
                !unit ||
                typeof unit.id !== "string" ||
                typeof unit.nazwa !== "string" ||
                !Number.isFinite(unit.koszt) ||
                unit.koszt < 0 ||
                !unit.statystyki ||
                !Array.isArray(unit.przedmioty) ||
                !Array.isArray(unit.zdolnosci)
            ) {
                throw new Error("Nieprawidłowa jednostka.");
            }

            if (unitIds.has(unit.id)) {
                throw new Error("Powtarzające się ID jednostki.");
            }

            unitIds.add(unit.id);

            for (const statDefinition of STAT_DEFINITIONS) {
                const stat = unit.statystyki[statDefinition.key];

                if (
                    !stat ||
                    !Number.isFinite(stat.obecne) ||
                    !Number.isFinite(stat.maksymalne) ||
                    stat.obecne < 0 ||
                    stat.maksymalne < 0 ||
                    stat.obecne > stat.maksymalne
                ) {
                    throw new Error(
                        `Nieprawidłowa statystyka: ${statDefinition.label}.`
                    );
                }
            }

            for (const item of unit.przedmioty) {
                if (
                    !item ||
                    typeof item.id !== "string" ||
                    typeof item.nazwa !== "string" ||
                    !Number.isFinite(item.koszt) ||
                    item.koszt < 0 ||
                    typeof item.zasieg !== "string" ||
                    typeof item.sila !== "string" ||
                    typeof item.opis !== "string"
                ) {
                    throw new Error("Nieprawidłowy przedmiot.");
                }
            }

            for (const skill of unit.zdolnosci) {
                if (
                    !skill ||
                    typeof skill.id !== "string" ||
                    typeof skill.nazwa !== "string" ||
                    !Number.isFinite(skill.koszt) ||
                    skill.koszt < 0 ||
                    typeof skill.opis !== "string"
                ) {
                    throw new Error("Nieprawidłowa zdolność.");
                }
            }
        }
    }
}


function importJson(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const importedData = JSON.parse(reader.result);

            if (
                !importedData ||
                importedData.version !== 1 ||
                !Array.isArray(importedData.rozpiski)
            ) {
                throw new Error("Nieprawidłowa struktura pliku JSON.");
            }

            normalizeData(importedData);

            validateImportedData(importedData);

            if (!confirm(
                "Import zastąpi wszystkie obecne rozpiski. Kontynuować?"
            )) {
                return;
            }

            appData = importedData;

            selectedRosterId = appData.rozpiski[0]?.id ?? null;
            selectedUnitId = null;
            editingUnitDraft = null;

            persistAndRender();

            alert("Pomyślnie wczytano rozpiski.");

        } catch (error) {
            console.error(error);
            alert(`Nie udało się wczytać JSON: ${error.message}`);

        } finally {
            event.target.value = "";
        }
    };

    reader.onerror = function () {
        alert("Nie udało się odczytać pliku.");
        event.target.value = "";
    };

    reader.readAsText(file);
}


/* =========================================
   12. EKSPORT JSON
========================================= */

function exportJson() {
    const json = JSON.stringify(appData, null, 4);

    const blob = new Blob(
        [json],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "rozpiski.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


/* =========================================
   13. PODPIĘCIE ZDARZEŃ
========================================= */

function initializeEvents() {

    // Rozpiski

    document.getElementById("btnAddRoster")
        .addEventListener("click", addRoster);

    document.getElementById("btnEditRoster")
        .addEventListener("click", editRoster);

    document.getElementById("btnDeleteRoster")
        .addEventListener("click", deleteRoster);


    // Jednostki

    document.getElementById("btnAddUnit")
        .addEventListener("click", addUnit);

    document.getElementById("btnEditUnit")
        .addEventListener("click", editUnit);

    document.getElementById("btnDeleteUnit")
        .addEventListener("click", deleteUnit);

    document.getElementById("btnSaveUnitChanges")
        .addEventListener("click", saveUnitChanges);

    document.getElementById("btnCancelUnitChanges")
        .addEventListener("click", cancelUnitChanges);


    // Przedmioty

    document.getElementById("btnAddItem")
        .addEventListener("click", addItem);


    // Zdolności

    document.getElementById("btnAddSkill")
        .addEventListener("click", addSkill);


    // JSON

    document.getElementById("btnOpenJson")
        .addEventListener("click", () => {
            document.getElementById("jsonFileInput").click();
        });

    document.getElementById("jsonFileInput")
        .addEventListener("change", importJson);

    document.getElementById("btnSaveJson")
        .addEventListener("click", exportJson);


    // Pola jednostki

    const unitFields = [
        "unitName",
        "unitCost",
        ...STAT_DEFINITIONS.flatMap(stat => [
            `unit${stat.key.toUpperCase()}Current`,
            `unit${stat.key.toUpperCase()}Max`
        ])
    ];

    unitFields.forEach(id => {
        const element = document.getElementById(id);

        if (!element) {
            console.error(`Nie znaleziono pola HTML: ${id}`);
            return;
        }

        element.addEventListener(
            "input",
            updateUnitDraftFromInputs
        );
    });
}


/* =========================================
   14. START APLIKACJI
========================================= */

function initializeApp() {
    loadFromLocalStorage();

    if (appData.rozpiski.length > 0) {
        selectedRosterId = appData.rozpiski[0].id;
    }

    initializeEvents();

    renderApp();
}

document.addEventListener("DOMContentLoaded", initializeApp);
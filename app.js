
const countries = [
  "Afrique du Sud",
  "Algérie",
  "Angola",
  "Bénin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroun",
  "Comores",
  "Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Égypte",
  "Érythrée",
  "Eswatini",
  "Éthiopie",
  "Gabon",
  "Gambie",
  "Ghana",
  "Guinée",
  "Guinée-Bissau",
  "Guinée équatoriale",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libye",
  "Madagascar",
  "Malawi",
  "Mali",
  "Maroc",
  "Maurice",
  "Mauritanie",
  "Mozambique",
  "Namibie",
  "Niger",
  "Nigeria",
  "Ouganda",
  "République centrafricaine",
  "République démocratique du Congo",
  "Rwanda",
  "Sao Tomé-et-Principe",
  "Sénégal",
  "Seychelles",
  "Sierra Leone",
  "Somalie",
  "Soudan",
  "Soudan du Sud",
  "Tanzanie",
  "Tchad",
  "Togo",
  "Tunisie",
  "Zambie",
  "Zimbabwe"
];

function createCountrySelector() {
  const hero = document.querySelector(".hero");

  if (!hero) return;

  const container = document.createElement("div");
  container.style.maxWidth = "380px";
  container.style.margin = "25px auto";
  container.style.textAlign = "left";

  const label = document.createElement("label");
  label.textContent = "🌍 Choisis ton pays";
  label.style.display = "block";
  label.style.marginBottom = "10px";
  label.style.fontWeight = "700";

  const select = document.createElement("select");
  select.id = "country";
  select.style.width = "100%";
  select.style.padding = "15px";
  select.style.borderRadius = "9px";
  select.style.background = "#111925";
  select.style.color = "white";
  select.style.border = "1px solid #00e5ff";
  select.style.fontSize = "15px";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Sélectionne ton pays";
  select.appendChild(placeholder);

  countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });

  const savedCountry = localStorage.getItem("madara_country");

  if (savedCountry && countries.includes(savedCountry)) {
    select.value = savedCountry;
  }

  select.addEventListener("change", () => {
    if (countries.includes(select.value)) {
      localStorage.setItem("madara_country", select.value);
    } else {
      localStorage.removeItem("madara_country");
    }
  });

  container.appendChild(label);
  container.appendChild(select);

  const button = hero.querySelector(".main-btn");

  if (button) {
    button.addEventListener("click", event => {
      if (!select.value) {
        event.preventDefault();
        alert("Choisis d'abord ton pays.");
      }
    });
  }

  if (button) {
    hero.insertBefore(container, button);
  } else {
    hero.appendChild(container);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  createCountrySelector();
});

"use strict";

const QUOTE_ENDPOINT =
  "https://hooks.casaveratx.com/webhook/casavera-quote";

const form = document.querySelector("#quote-form");
const serviceField = document.querySelector("#service");
const frequencyField = document.querySelector("#frequency");
const quoteButton = document.querySelector("#quote-button");
const formStatus = document.querySelector("#form-status");

const resultSection = document.querySelector("#quote-result");
const initialPriceElement = document.querySelector("#initial-price");
const recurringBlock = document.querySelector(
  "#recurring-price-block"
);
const recurringLabel = document.querySelector("#recurring-label");
const recurringPriceElement = document.querySelector(
  "#recurring-price"
);
const quoteMessage = document.querySelector("#quote-message");

const continueButton =
  document.querySelector("#continue-button");

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const frequencyLabels = {
  weekly: "Future weekly cleanings",
  biweekly: "Future biweekly cleanings",
  monthly: "Future monthly cleanings",
};

function resetResult() {
  resultSection.hidden = true;
  recurringBlock.hidden = true;
  formStatus.textContent = "";
}

serviceField.addEventListener("change", () => {
  if (serviceField.value === "move_in_out") {
    frequencyField.value = "one_time";
    frequencyField.disabled = true;
  } else {
    frequencyField.disabled = false;
  }

  resetResult();
});

form.addEventListener("input", resetResult);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  quoteButton.disabled = true;
  quoteButton.textContent = "Calculating…";
  formStatus.textContent = "";
  resultSection.hidden = true;

  const formData = new FormData(form);

  const requestBody = {
    service: formData.get("service"),
    frequency:
      serviceField.value === "move_in_out"
        ? "one_time"
        : formData.get("frequency"),
    bedrooms: Number(formData.get("bedrooms")),
    bathrooms: Number(formData.get("bathrooms")),
    squareFootageBand: formData.get("squareFootageBand"),
    condition: formData.get("condition"),
    zipCode: String(formData.get("zipCode")).trim(),
  };

  try {
    const response = await fetch(QUOTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      handleQuoteError(data);
      return;
    }

    if (data.status === "manual_review") {
      formStatus.textContent =
        data.message ||
        "This home requires a customized quote.";
      return;
    }

    displayQuote(data);
  } catch (error) {
    console.error("Quote request failed:", error);

    formStatus.textContent =
      "We could not calculate your quote right now. Please try again.";
  } finally {
    quoteButton.disabled = false;
    quoteButton.textContent = "Get my price";
  }
});

function displayQuote(data) {
  initialPriceElement.textContent =
    moneyFormatter.format(data.initialPrice);

  if (
    data.recurringPrice !== null &&
    data.recurringPrice !== undefined
  ) {
    recurringLabel.textContent =
      frequencyLabels[data.recurringFrequency] ||
      "Future recurring cleanings";

    recurringPriceElement.textContent =
      moneyFormatter.format(data.recurringPrice);

    recurringBlock.hidden = false;

    quoteMessage.textContent =
      "Your first visit prepares the home for recurring maintenance service.";
  } else {
    recurringBlock.hidden = true;

    quoteMessage.textContent =
      "This estimate is based on the information you provided.";
  }

  sessionStorage.setItem(
    "casaVeraQuote",
    JSON.stringify({
      quote: data,
      customerSelections: {
        service: data.inputs.service,
        frequency: data.inputs.frequency,
        bedrooms: data.inputs.bedrooms,
        bathrooms: data.inputs.bathrooms,
        squareFootageBand: data.inputs.squareFootageBand,
        condition: data.inputs.condition,
        zipCode: data.inputs.zipCode,
      },
    })
  );

  resultSection.hidden = false;

  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

continueButton.addEventListener("click", () => {
  window.location.href = "/booking.html";
});

function handleQuoteError(data) {
  if (data.status === "outside_service_area") {
    formStatus.textContent =
      "Casa Vera does not currently serve this ZIP code.";
    return;
  }

  if (
    data.status === "invalid_request" &&
    Array.isArray(data.errors)
  ) {
    formStatus.textContent = data.errors.join(" ");
    return;
  }

  formStatus.textContent =
    data.message ||
    "We could not calculate this quote. Please check your answers.";
}
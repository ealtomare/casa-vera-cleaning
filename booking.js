"use strict";

const storedQuoteText =
  sessionStorage.getItem("casaVeraQuote");

if (!storedQuoteText) {
  window.location.replace("/quote.html");
} else {
  initializeBookingPage(JSON.parse(storedQuoteText));
}

function initializeBookingPage(storedData) {
  const quote = storedData.quote;
  const selections = storedData.customerSelections;

  const moneyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const serviceLabels = {
    standard_clean: "Standard cleaning",
    deep_clean: "Deep cleaning",
    move_in_out: "Move-in or move-out cleaning",
  };

  const frequencyLabels = {
    one_time: "One-time service",
    weekly: "Weekly service",
    biweekly: "Every two weeks",
    monthly: "Monthly service",
  };

  document.querySelector(
    "#booking-initial-price"
  ).textContent = moneyFormatter.format(
    quote.initialPrice
  );

  const recurringBlock = document.querySelector(
    "#booking-recurring-block"
  );

  if (
    quote.recurringPrice !== null &&
    quote.recurringPrice !== undefined
  ) {
    document.querySelector(
      "#booking-recurring-price"
    ).textContent = moneyFormatter.format(
      quote.recurringPrice
    );

    document.querySelector(
      "#booking-recurring-label"
    ).textContent =
      `${frequencyLabels[quote.recurringFrequency]} afterward`;

    recurringBlock.hidden = false;
  }

  document.querySelector(
    "#booking-service-summary"
  ).textContent =
    `${serviceLabels[selections.service]} · ` +
    `${frequencyLabels[selections.frequency]} · ` +
    `${selections.bedrooms} bedrooms · ` +
    `${selections.bathrooms} bathrooms`;

  document.querySelector(
    "#bookingZipCode"
  ).value = selections.zipCode;

  const requestedDate =
    document.querySelector("#requestedDate");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  requestedDate.min =
    tomorrow.toISOString().split("T")[0];
}

document
  .querySelector("#booking-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();

    document.querySelector(
      "#booking-status"
    ).textContent =
      "The form is working. Scheduling will be connected next.";
  });
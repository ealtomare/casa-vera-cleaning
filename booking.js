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

const BOOKING_ENDPOINT =
  "https://hooks.casaveratx.com/webhook/casavera-booking";

const bookingForm = document.querySelector("#booking-form");
const bookingStatus = document.querySelector("#booking-status");

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) {
    return;
  }

  const storedQuoteText =
    sessionStorage.getItem("casaVeraQuote");

  if (!storedQuoteText) {
    window.location.replace("/quote.html");
    return;
  }

  const storedData = JSON.parse(storedQuoteText);
  const selections = storedData.customerSelections;

  const formData = new FormData(bookingForm);
  const submitButton =
    bookingForm.querySelector('button[type="submit"]');

  const requestBody = {
    firstName: String(formData.get("firstName")).trim(),
    lastName: String(formData.get("lastName")).trim(),
    email: String(formData.get("email")).trim(),
    phone: String(formData.get("phone")).trim(),
    address: String(formData.get("address")).trim(),
    city: String(formData.get("city")).trim(),
    zipCode: String(formData.get("bookingZipCode")).trim(),
    requestedDate: formData.get("requestedDate"),
    requestedWindow: formData.get("requestedWindow"),
    notes: String(formData.get("bookingNotes") || "").trim(),

    service: selections.service,
    frequency: selections.frequency,
    bedrooms: selections.bedrooms,
    bathrooms: selections.bathrooms,
    squareFootageBand: selections.squareFootageBand,
    condition: selections.condition,
  };

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";
  bookingStatus.textContent = "";

  try {
    const response = await fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      bookingStatus.textContent =
        data.message ||
        "We could not submit your booking. Please check your information.";

      return;
    }

    sessionStorage.removeItem("casaVeraQuote");

    window.location.href =
      `/thank-you.html?booking=${encodeURIComponent(
        data.bookingReference || ""
      )}`;
  } catch (error) {
    console.error("Booking request failed:", error);

    bookingStatus.textContent =
      "We could not submit your booking right now. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Continue";
  }
});
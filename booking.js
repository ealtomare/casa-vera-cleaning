"use strict";

const AVAILABILITY_ENDPOINT =
  "https://hooks.casaveratx.com/webhook/casavera-availability";

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
    
  const selectedSlot =
    document.querySelector("#selectedSlot");

  const availabilityStatus =
    document.querySelector("#availability-status");

  requestedDate.addEventListener("change", () => {
    loadAvailability({
      requestedDate: requestedDate.value,
      selections,
      selectedSlot,
      availabilityStatus,
  });
});
}

async function loadAvailability({
  requestedDate,
  selections,
  selectedSlot,
  availabilityStatus,
}) {
  selectedSlot.disabled = true;

  selectedSlot.innerHTML =
    '<option value="">Checking availability…</option>';

  availabilityStatus.textContent =
    "Checking the Casa Vera calendar…";

  if (!requestedDate) {
    selectedSlot.innerHTML =
      '<option value="">Choose a date first</option>';

    availabilityStatus.textContent = "";
    return;
  }

  try {
    const response = await fetch(AVAILABILITY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestedDate,
        service: selections.service,
        squareFootageBand:
          selections.squareFootageBand,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Availability request failed."
      );
    }

    if (!Array.isArray(data.slots)) {
      throw new Error(
        "The availability response did not contain a slots array."
      );
    }

    selectedSlot.innerHTML =
      '<option value="">Choose an available time</option>';

    if (data.slots.length === 0) {
      selectedSlot.innerHTML =
        '<option value="">No times available</option>';

      availabilityStatus.textContent =
        "No appointments are available on this date. Please choose another date.";

      return;
    }

    for (const slot of data.slots) {
      const option = document.createElement("option");

      option.value = slot.slotId;
      option.textContent = slot.label;

      /*
        Save the exact calendar times on the option.
        The booking request will use these later.
      */
      option.dataset.start = slot.start;
      option.dataset.end = slot.end;

      selectedSlot.appendChild(option);
    }

    selectedSlot.disabled = false;

    availabilityStatus.textContent =
      data.slots.length === 1
        ? "1 appointment time is available."
        : `${data.slots.length} appointment times are available.`;
  } catch (error) {
    console.error(
      "Availability request failed:",
      error
    );

    selectedSlot.innerHTML =
      '<option value="">Unable to load times</option>';

    availabilityStatus.textContent =
      "We could not check availability right now. Please try another date or refresh the page.";
  }
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

  const selectedSlotField =
  document.querySelector("#selectedSlot");

  const selectedOption =
  selectedSlotField.options[selectedSlotField.selectedIndex];

if (
  !selectedOption ||
  !selectedOption.value ||
  !selectedOption.dataset.start ||
  !selectedOption.dataset.end
) {
  bookingStatus.textContent =
    "Please choose an available appointment time.";

  return;
}

  const requestBody = {
    firstName: String(formData.get("firstName")).trim(),
    lastName: String(formData.get("lastName")).trim(),
    email: String(formData.get("email")).trim(),
    phone: String(formData.get("phone")).trim(),
    address: String(formData.get("address")).trim(),
    city: String(formData.get("city")).trim(),
    zipCode: String(formData.get("bookingZipCode")).trim(),
    requestedDate: formData.get("requestedDate"),
    selectedSlotId: selectedOption.value,
    slotLabel: selectedOption.textContent,
    slotStart: selectedOption.dataset.start,
    slotEnd: selectedOption.dataset.end,    notes: String(formData.get("bookingNotes") || "").trim(),

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
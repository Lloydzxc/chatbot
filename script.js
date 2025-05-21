// FAQ responses stored in an object
const faq_responses = {
  "what time is the sunday service": "Sunday service starts at 10 AM.",
  "how can i donate": "You can donate online through our website or during the Sunday service. Gcash/PayMaya/GoTyme(09299605132)",
  "where is the church located": "Our church is located at 204, Windsor Tower Condominium, Sotto Street 1200 Makati National Capital Region.",
  "how can i submit a prayer request": "You can submit a prayer request on our website or directly here by typing it out.",
  "do you have youth services": "Youth services are held every Saturday at 4 PM."
};


//  Check login state and update navbar when page loads
window.onload = function () {
  const userLoggedIn = localStorage.getItem("userLoggedIn");

  const loginTab = document.getElementById("login-link");
  const profileTab = document.getElementById("profile-tab");

  if (loginTab && profileTab) {
    if (userLoggedIn === "true") {
      loginTab.style.display = "none";
      profileTab.style.display = "block";
    } else {
      loginTab.style.display = "block";
      profileTab.style.display = "none";
    }
  }

  //  Listen for Enter key press inside the input
  const input = document.getElementById("user-input");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // prevent new line
        sendMessage();      // send message
      }
      // If Shift+Enter: allow default (new line)
    });
  }
  
  // Display greeting and FAQ
  setTimeout(() => {
    appendMessage("Bot", "Hello! How can I help you today? Here are some quick options:", "bot-message");
    appendFAQButtons();
  }, 1000);
};

//  Logout function
function logout() {
  localStorage.removeItem("userLoggedIn");
  window.location.href = "login.html";
}

//  Generate time slot options
function generateTimeOptions(start, end, stepMinutes, unavailable = []) {
  const options = [];
  let [hour, minute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  while (hour < endHour || (hour === endHour && minute <= endMinute)) {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
    const timeStr = `${h}:${m}`;
    const isDisabled = unavailable.includes(timeStr);
    options.push(`<option value="${timeStr}" ${isDisabled ? "disabled" : ""}>${timeStr}${isDisabled ? " (Unavailable)" : ""}</option>`);
    minute += stepMinutes;
    if (minute >= 60) {
      minute -= 60;
      hour++;
    }
  }

  return options.join("\n");
}

let pendingBookingEvent = null; // make sure this is declared at the top of the script

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  appendMessage("You", message, "user-message");

  const chatBox = document.getElementById("chat-box");

  // FIRST: Handle "yes" without sending to server
  if (pendingBookingEvent) {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("yes")) {
      appendMessage("Bot", `Great! Let’s proceed to booking your ${pendingBookingEvent}.`, "bot-message");
      setTimeout(() => {
        appendMessage("Bot", "", "bot-message", true); // show booking form
        input.value = "";
        input.focus();
      }, 800);
      pendingBookingEvent = null;  // Reset pending event
      return;
    }

    if (lowerMsg.includes("no")) {
      appendMessage("Bot", "❌ Okay, no problem. Let us know if you need anything else.", "bot-message");
      pendingBookingEvent = null;  // Reset pending event
      input.value = "";
      input.focus();
      return;
    }
  }

  //  THEN: Get response from server
  const response = await getBotResponse(message);

  // short pause before replying
  await new Promise(resolve => setTimeout(resolve, 400));

  //  Handle booking confirmation and duplicate booking
  if (response.startsWith("__CONFIRM_BOOKING__::")) {
    const event = response.split("::")[1];
    pendingBookingEvent = event;

    appendMessage("Bot", `✅ Yes, ${event} is available. Would you like to look for available schedule? (Type "yes" or "no")`, "bot-message");
    input.value = "";
    input.focus();
    return;
  }

  //  Check if the response is a duplicate booking message
  if (response.duplicate) {
    appendMessage("Bot", response.message, "bot-message");
    return;
  }

  //  Default reply
  appendMessage("Bot", response, "bot-message");
  input.value = "";
  input.focus();
}

//  Append message to chat (with optional booking form)
async function appendMessage(sender, message, messageType, isBookingForm = false) {
  const chatBox = document.getElementById("chat-box");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add(messageType);

  if (isBookingForm) {
    const today = new Date().toISOString().split("T")[0];

    //  Fetch unavailable times for today
    const res = await fetch(`/api/unavailable-times?date=${today}`);
    const data = await res.json();
    const unavailable = data.unavailableTimes || [];

    const timeOptions = generateTimeOptions("08:00", "18:00", 60, unavailable);

    messageDiv.innerHTML = `
      <form id="bookingForm" class="booking-form">
        <select name="event">
          <option value="Baptism">Baptism</option>
          <option value="Wedding">Wedding</option>
          <option value="Funeral Services">Funeral Services</option>
          <option value="Baby Dedications">Baby Dedications</option>
          <option value="House Blessing">House Blessing</option>
        </select>
        <input type="date" name="date" value="${today}" min="${today}" required />
        <select name="time" required>
          ${timeOptions}
        </select>
        <button type="submit">Submit</button>
      </form>
    `;

    setTimeout(() => {
      const form = document.getElementById("bookingForm");
      form.onsubmit = async function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        console.log("📤 Booking form submitted:", data);

        // ⬇Only runs if no existing booking
        const res = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const result = await res.json();
          let message = `✅ Thank you! Your booking for <strong>${data.event}</strong> on ${data.date} at ${data.time} has been received.`;
          let extraNote = "";
          let icon = "";

          switch (data.event) {
            case "Baptism":
              icon = "👶";
              extraNote = "Please bring your birth certificate and arrive 15 minutes early.";
              break;
            case "Wedding":
              icon = "💍";
              extraNote = "Make sure both parties bring valid ID and arrive on time.";
              break;
            case "Funeral Services":
              icon = "🕊️";
              extraNote = "We are with you in prayer. Please call the church office for preparation details.";
              break;
            case "Baby Dedications":
              icon = "🍼";
              extraNote = "Please arrive early and bring your baby’s name details.";
              break;
            case "House Blessing":
              icon = "🏠";
              extraNote = "Prepare holy water, oil, and a Bible at your house entrance.";
              break;
            case "Youth Group":
              icon = "🎉";
              extraNote = "Please arrive by 3:45 PM for attendance and preparation.";
              break;
            case "Sunday Service":
              icon = "🙏";
              extraNote = "We look forward to worshiping with you. Feel free to bring your Bible!";
              break;
            default:
              extraNote = "";
          }

          appendMessage("Bot", `${icon} ${message}<br><br><em>${extraNote}</em>`, "bot-message");

        form.remove();
      };
    }, 0);
  } else {
    messageDiv.innerHTML = message;
  }

  msgDiv.appendChild(messageDiv);
  chatBox.appendChild(msgDiv);
  scrollToBottom();
}

//  Fetch chatbot response
async function getBotResponse(message) {
  const res = await fetch("/api/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const data = await res.json();
  return data.reply;
}

//  Send FAQ-based question
function sendFAQ(faq) {
  const faqLower = faq.toLowerCase();

  if (faqLower.includes("book")) {
    appendMessage("Bot", "", "bot-message", true); // Show form
    return;
  }

  const response = faq_responses[faqLower];
  appendMessage("Bot", response, "bot-message");
}

//  Add FAQ buttons to chat
function appendFAQButtons() {
  const faqButtons = [
    { text: "🕙 Sunday Service Time", faq: "What time is the Sunday service" },
    { text: "💰 How to Donate", faq: "How can I donate" },
    { text: "📍 Church Location", faq: "Where is the church located" },
    { text: "🙏 Prayer Request", faq: "How can I submit a prayer request" },
    { text: "🧒 Youth Services", faq: "Do you have youth services" },
    { text: "🗓️ Book Event", faq: "book" }
  ];

  const chatBox = document.getElementById("chat-box");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("faq-buttons-container");

  faqButtons.forEach(button => {
    const faqButton = document.createElement("button");
    faqButton.textContent = button.text;
    faqButton.onclick = () => sendFAQ(button.faq);
    messageDiv.appendChild(faqButton);
  });

  msgDiv.appendChild(messageDiv);
  chatBox.appendChild(msgDiv);
  scrollToBottom();
}

//  Scroll chat to bottom
function scrollToBottom() {
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;
}
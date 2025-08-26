document.querySelectorAll("#enable > div:last-of-type > div button").forEach(button => {
    button.addEventListener("click", () => {
        document.getElementById("enable_email").click();
    })
})

document.querySelectorAll("#days span").forEach(span => {
    span.addEventListener("click", () => {
        span.previousElementSibling.click();
    })
})

document.querySelector("header button:first-of-type").addEventListener("click", () => {
    window.location.href = "/vm";
})

document.querySelector("header button:nth-of-type(2)").addEventListener("click", () => {
    window.location.href = "/items";
})

document.querySelector("header button:last-of-type").addEventListener("click", () => {
    window.location.href = "/notifications";
})

fetch("/get_email_details", {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    }
})
.then(response => {
    if (!response.ok) {
        return response.json().then(error => {
            throw new Error(error.error || 'Unknown error');
        });
    }
    return response.json();
})
.then(data => {
    set_email_settings("enable_email", data[0]["email_value"]);
    set_email_settings("recipient_input", data[1]["email_value"]);
    for (let i = 2; i < 9; i++) {
        set_email_settings(data[i]["email_setting"], data[i]["email_value"]);
    }
    set_email_settings("quantity_threshold_input", data[9]["email_value"]);
})
.catch(error => {
    if (!error.name.toLowerCase().includes("typeerror")) {
        console.error(`Failed to fetch /add_item: ${error}`);
    } else {
        document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
        document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
    }
})

function set_email_settings(element1, value) {
    const element = document.getElementById(element1);

    if (element) {
        switch (true) {
            case element.type === "checkbox":
                element.checked = value == 1 ? true : false;
                break;
            case element.type === "text" || element.type === "email" || element.type === "number":
                element.value = value;
                break;
            default:
                break;
        }
    } else {
        console.error(`Element ${element1} not found`);
    }
}

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
        if (input.type === "checkbox") {
            input.value = input.checked ? 1 : 0;
        }


        fetch(`/update_email_details?email_setting=${input.id}&email_value=${input.value}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.error || 'Unknown error');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            if (!error.name.toLowerCase().includes("typeerror")) {
                console.error(`Failed to fetch /add_item: ${error}`);
            } else {
                document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
                document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
            }
        })
    })
})
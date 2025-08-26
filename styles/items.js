document.querySelector("header button:last-of-type").addEventListener("click", () => {
    window.location.href = "/items";
})

window.onload = () => {
    document.querySelector(".loader").style.display = "none";

    document.querySelectorAll(".item1 input, .item1 textarea").forEach(input => {
        input.addEventListener("input", () => {
            const input_name = input.classList[0];
            const input_value = input.value;

            fetch(`/update_item?item_id=${input.closest(".item1").getAttribute("data-id")}&${input_name}=${input_value}`, {
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
                    console.error(`Failed to fetch /update_item: ${error}`);
                } else {
                    document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
                    document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
                }
            })
        })
    })

    document.querySelectorAll(".item1 > span:first-of-type").forEach(span => {
        span.addEventListener("click", () => {
            fetch(`/update_item?item_id=${span.closest(".item1").getAttribute("data-id")}&availability=${span.classList.contains("status1") ? 0 : 1}`, {
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
                if (data["updated"]) {
                    if (data["availability"] === 1) {
                        span.classList.replace("status3", "status1");
                    } else {
                        span.classList.replace("status1", "status3");
                    }
                }
            })
            .catch(error => {
                if (!error.name.toLowerCase().includes("typeerror")) {
                    console.error(`Failed to fetch /update_item: ${error}`);
                } else {
                    document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
                    document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
                }
            })
        })
    })
}

fetch("/get_all_items", {
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
    data["items"].forEach(item => {
        const template = document.getElementById("item_data");
        let clone = document.importNode(template.content, true).querySelector("div");

        clone.setAttribute("data-id", item["item_id"]);
        clone.querySelector("span:first-of-type").classList.add(item["availability"] === 0 ? "status3" : "status1");
        clone.querySelector("span:first-of-type").title = item["availability"] === 0 ? "Unavailable" : "Available";
        clone.querySelector("img").src = `/item_images/${item["item_image"]}.webp`;
        clone.querySelector("img").alt = item["item_image"];
        clone.querySelector("textarea").value = item["item_name"];
        clone.querySelector("input:first-of-type").value = item["item_cost"];
        clone.querySelector("div:last-of-type > div:last-of-type > input").value = item["item_quantity"];

        document.querySelector("#items_page > section:nth-of-type(2)").appendChild(clone);
    })
})
.catch(error => {
    if (!error.name.toLowerCase().includes("typeerror")) {
        console.error(`Failed to fetch /get_all_items: ${error}`);
    } else {
        document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
        document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
    }
});

function filter(category) {
    const category_map = {
        all: 0,
        available: 1,
        unavailable: 2
    };

    const category_id = category_map[category.toLowerCase()] ?? 0;
    let search_term = document.getElementById("search").value;
    let new_search_term = search_term.trim().toLowerCase();

    document.querySelectorAll(".item1").forEach(item => {
        const span = item.querySelector("span");
        const status1 = span?.classList.contains("status1");
        const status3 = span?.classList.contains("status3");

        const inputs = item.querySelectorAll("textarea, input");
        const matched = Array.from(inputs).some(el => 
            el.value.toLowerCase().includes(new_search_term)
        );

        const matches_category = category_id === 0 || (category_id === 1 && status1) || (category_id === 2 && status3);
        item.style.display = matches_category && matched ? "flex" : "none";
    });
}



document.querySelectorAll("input[name='availability']").forEach((radio) => {
    radio.addEventListener("change", function () {
        filter(radio.nextElementSibling.textContent.toLowerCase());
    });
});

document.getElementById("search").addEventListener("input", function () {
    filter(this.value);
});

document.querySelector("header button:first-of-type").addEventListener("click", () => {
    window.location.href = "/vm";
})

document.querySelector("header button:nth-of-type(2)").addEventListener("click", () => {
    window.location.href = "/items";
})

document.querySelector("header button:last-of-type").addEventListener("click", () => {
    window.location.href = "/notifications";
})

const drop_zone = document.getElementById('drop_zone');
const fileInput = document.getElementById('image');

drop_zone.addEventListener('drop', (event) => {
    event.preventDefault();    
    const files = event.dataTransfer.files;
    handleFiles(files);
});

drop_zone.addEventListener('click', () => {
    fileInput.click();
});

drop_zone.addEventListener('dragover', (event) => {
    event.preventDefault();
});

fileInput.addEventListener('change', (event) => {
    drop_zone.style.display = 'none';
    document.getElementById("file_name").style.display = "flex";
    document.querySelector("#file_name p").textContent = event.target.files[0].name;
});

document.querySelector("#file_name i").addEventListener("click", () => {
    drop_zone.style.display = "flex";
    document.getElementById("file_name").style.display = "none";
    document.querySelector("#file_name p").textContent = "";
    fileInput.value = "";
})

function handleFiles(files) {
    const file = files[0];

    if (file) {
        drop_zone.style.display = 'none';
        document.getElementById("file_name").style.display = "flex";
        document.querySelector("#file_name p").textContent = file.name;
    }
}

document.querySelector(".add_item i").addEventListener("click", () => {
    document.querySelector(".add_item").style.display = "none";
})

function lazyLoad() {
    const listItems = document.querySelectorAll("img, textarea, input, div, span");
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            const element = entry.target;
            element.style.visibility = entry.isIntersecting ? "visible" : "hidden";
        });
    }, { root: null, rootMargin: "450px", threshold: 0 });

    listItems.forEach(item => observer.observe(item));
}

window.addEventListener("scroll", lazyLoad);
window.addEventListener("DOMContentLoaded", lazyLoad);

document.querySelector("#items_page > section:nth-of-type(1) button").addEventListener("click", () => {
    document.querySelector(".add_item").style.display = "flex";

    document.querySelectorAll(".add_item > form input:not([type='file'])").forEach(input => {
        input.value = localStorage.getItem(input.name);
    })
})

document.querySelector("section:nth-of-type(2)").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) {
        if (button.querySelector(".fa-minus")) {
            button.nextElementSibling.value = parseInt(button.nextElementSibling.value) - 1;
            button.nextElementSibling.dispatchEvent(new Event("input"));
        } else if (button.querySelector(".fa-plus")) {
            button.previousElementSibling.value = parseInt(button.previousElementSibling.value) + 1;
            button.previousElementSibling.dispatchEvent(new Event("input"));
        }  
    }
})

function find_next_p(input) {
    let current = input;
  
    while (current) {
        let next = current.nextElementSibling;
        while (next) {
            if (next.tagName === 'P') {
                return next;
            }
            next = next.nextElementSibling;
        }
  
        current = current.parentElement;
    }
  
    return null;
}

document.querySelector(".add_item > form").addEventListener("submit", (event) => {
    event.preventDefault();
    let can_submit = true;

    document.querySelectorAll(".add_item > form input").forEach(input => {
        if (input.type === "radio") {
            const radio = document.querySelectorAll(`input[name="${input.name}"]`);
            const checked = Array.from(radio).some(radio => radio.checked);
            
            if (!checked) {
                find_next_p(input).style.display = "block";
                can_submit = false;
            }
        } else {
            if (input.value === "") {
                find_next_p(input).style.display = "block";
                can_submit = false;
            }
        }
    })

    if (can_submit) {
        fetch("/add_item", {
            method: "POST",
            body: new FormData(document.querySelector(".add_item > form"))
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
            if (data["added"]) {
                const template = document.getElementById("item_data");
                let clone = document.importNode(template.content, true).querySelector("div");

                clone.setAttribute("data-id", data["id"]);
                clone.querySelector("span:first-of-type").classList.add(data["availability"] === 0 ? "status3" : "status1");
                clone.querySelector("span:first-of-type").title = data["availability"] === 0 ? "Unavailable" : "Available";
                clone.querySelector("img").src = `/item_images/${data["name"]}.webp`;
                clone.querySelector("img").alt = data["name"];
                clone.querySelector("textarea").value = data["name"];
                clone.querySelector("input:first-of-type").value = data["cost"];
                clone.querySelector("div:last-of-type > div:last-of-type > input").value = data["quantity"];
                document.querySelector("#items_page > section:nth-of-type(2)").appendChild(clone);

                document.querySelector(".add_item").style.display = "none";
            }

            document.querySelectorAll(".add_item > form input").forEach(input => {
                input.value = "";
            })
            localStorage.clear();
        })
        .catch(error => {
            if (!error.name.toLowerCase().includes("typeerror")) {
                console.error(`Failed to fetch /add_item: ${error}`);
            } else {
                document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
                document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
            }
        });
    }
})

document.querySelectorAll(".add_item > form input").forEach(input => {
    input.addEventListener("input", () => {
        find_next_p(input).style.display = "none";
        localStorage.setItem(input.id, input.value);
    })
})

document.querySelector("#items_page > section:nth-of-type(2)").addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "i" && event.target.classList.contains("fa-xmark")) {
        const confirmation = document.querySelector(".confirmation");
        confirmation.style.display = "flex";
        confirmation.querySelector("button:first-of-type").addEventListener("click", () => {
            const item_id = event.target.closest(".item1").getAttribute("data-id");

            fetch(`/delete_item?item_id=${item_id}`, {
                method: "DELETE",
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
                if (data["deleted"]) {
                    event.target.closest(".item1").remove();
                    confirmation.style.display = "none";
                }
            })
            .catch(error => {
                if (!error.name.toLowerCase().includes("typeerror")) {
                    console.error(`Failed to fetch /delete_item: ${error}`);
                } else {
                    document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
                    document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
                }
            });
        })

        confirmation.querySelector("button:last-of-type").addEventListener("click", () => {
            confirmation.style.display = "none";
        })
    }
})

const drop_zone1 = document.getElementById('drop_zone1');
const file_input1 = document.getElementById('new');

drop_zone1.addEventListener('drop', (event) => {
    event.preventDefault();    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFile1(files[0]); // Pass the first file to the handler
    }
});

drop_zone1.addEventListener('click', () => {
    file_input1.click();
});

drop_zone1.addEventListener('dragover', (event) => {
    event.preventDefault();
});

file_input1.addEventListener('change', (event) => {
    drop_zone1.style.display = 'none';
    const file = event.target.files[0];
    if (file) {
        handleFile1(file);
    }
});

document.querySelector("#new + div").addEventListener("click", () => {
    document.getElementById("new_image_preview").src = "";
    document.getElementById("new_image_preview").parentElement.style.display = "none";
    document.getElementById("drop_zone1").style.display = "flex";
    document.getElementById("new").value = "";
})

function handleFile1(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('new_image_preview');
        if (img) {
            img.parentElement.style.display = 'block';
            img.src = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

document.querySelector(".change_image i").addEventListener("click", () => {
    document.querySelector(".change_image").style.display = "none";
    document.getElementById("new_image_preview").src = "";
    document.getElementById("new_image_preview").parentElement.style.display = "none";
    document.getElementById("drop_zone1").style.display = "flex";
    document.getElementById("new").value = "";
})

document.querySelector("#items_page > section:last-of-type").addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "div" && event.target.classList.contains("item1_image")) {
        document.querySelector(".change_image").style.display = "flex";
        document.querySelector(".change_image img").src = event.target.querySelector("img").src;
        document.querySelector(".change_image h3 span").textContent = event.target.querySelector("img").alt;
    }
})

document.querySelector(".change_image form").addEventListener("submit", (event) => {
    event.preventDefault();

    const file_input = document.getElementById("new");
    if (file_input.files.length === 0) {
        return;
    }

    const file = document.getElementById("new").files[0];
    const file_name = document.querySelector(".change_image h3 span").textContent;
    const file_type = file.type;
    
    const form_data = new FormData();
    form_data.append("image", file);

    fetch(`/update_item_image?filename=${file_name}&filetype=${file_type}`, {
        method: "PUT",
        body: form_data
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
        if (data["updated"]) {
            location.reload();
        }    
    })
    .catch(error => {
        if (!error.name.toLowerCase().includes("typeerror")) {
            console.error(`Failed to fetch /update_item_image: ${error}`);
        } else {
            document.querySelector("#items_page > section:nth-of-type(1) > div span").classList.replace("status1", "status3");
            document.querySelector("#items_page > section:nth-of-type(1) > div p").textContent = "Disconnected";
        }
    })
})
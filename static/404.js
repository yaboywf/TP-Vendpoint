document.querySelector("header button:first-of-type").addEventListener("click", () => {
    window.location.href = "/vm";
})

document.querySelector("header button:nth-of-type(2)").addEventListener("click", () => {
    window.location.href = "/items";
})

document.querySelector("header button:last-of-type").addEventListener("click", () => {
    window.location.href = "/notifications";
})

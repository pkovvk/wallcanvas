const canvas = new fabric.Canvas("c");

function fitCanvas() {

    const scale = Math.min(
        (window.innerWidth - 40) / 1920,
        (window.innerHeight - 40) / 1080
    );


    canvas.setZoom(scale);


    canvas.renderAll();

}


window.addEventListener(
    "resize",
    fitCanvas
);


fitCanvas();


canvas.backgroundColor = "#000";


let drawing = false;



// =====================
// USER / LOCK
// =====================


let userName =
    localStorage.getItem("name") || "";



window.onload = () => {

    document.getElementById("nameInput").value =
        userName;

    showOverlay("Вход");

};




async function enterEditor() {


    userName =
        document.getElementById("nameInput")
            .value
            .trim();



    if (!userName) {
        return;
    }


    localStorage.setItem(
        "name",
        userName
    );



    const lock =
        await fetch("/lock")
            .then(r => r.json());



    if (lock.locked) {

        showToast(
            lock.name + " сейчас редактирует"
        );

        return;
    }



    const result =
        await fetch("/lock",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: userName
                })
            })
            .then(r => r.json());



    if (result.ok) {

        hideOverlay();

    }

}




function showOverlay(text) {


    const overlay =
        document.getElementById("overlay");


    overlay.style.display = "flex";


    document.getElementById(
        "overlayTitle"
    ).innerText = text;


}



function hideOverlay() {

    document.getElementById("overlay")
        .style.display = "none";

}





function showToast(text) {


    const toast =
        document.getElementById("toast");


    toast.innerText = text;


    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}



// =====================
// Загрузка состояния
// =====================


fetch("/state")
    .then(r => r.json())
    .then(data => {

        if (data.objects) {

            canvas.loadFromJSON(
                data,
                () => {
                    canvas.renderAll();
                }
            );

        }

    });





// =====================
// Добавление фото
// =====================


document
    .getElementById("file")
    .onchange = async (e) => {


        let file =
            e.target.files[0];


        let form =
            new FormData();


        form.append(
            "image",
            file
        );



        let res =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: form
                }
            );



        let data =
            await res.json();



        fabric.Image.fromURL(
            data.url,
            img => {


                img.scaleToWidth(500);


                canvas.add(img);


                canvas.centerObject(img);


                canvas.setActiveObject(img);


                canvas.renderAll();

            }
        );


    };






// =====================
// Сохранение
// =====================


async function save() {


    await fetch("/state",
        {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body:
                JSON.stringify(
                    canvas.toJSON()
                )

        });



    await fetch("/unlock",
        {
            method: "POST"
        });



    showOverlay(
        "Сохранение успешно"
    );


}






// =====================
// Удаление
// =====================


async function remove() {


    const obj =
        canvas.getActiveObject();



    if (!obj)
        return;



    canvas.remove(obj);


    canvas.renderAll();



    await fetch("/sync",
        {
            method: "POST"
        });


}






// =====================
// Рисование
// =====================



function toggleDrawing() {


    drawing = !drawing;



    canvas.isDrawingMode =
        drawing;



    const panel =
        document.getElementById(
            "brushPanel"
        );



    if (drawing) {


        panel.style.display = "flex";


        canvas.freeDrawingBrush.width = 7;


        canvas.freeDrawingBrush.color = "#fff";


        canvas.selection = false;


        canvas.discardActiveObject();


    }
    else {


        panel.style.display = "none";


        canvas.selection = true;


    }



    canvas.renderAll();

}




function setBrushSize(size) {

    canvas.freeDrawingBrush.width = size;

}



function setBrushColor(color) {

    canvas.freeDrawingBrush.color = color;

}





document.addEventListener(
    "keydown",
    e => {

        if (
            e.key === "Delete" &&
            !drawing
        ) {

            remove();

        }

    });
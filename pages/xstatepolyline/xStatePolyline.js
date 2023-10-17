import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiACwBWABxFlAZgBMygOyaAbHtXbFfPQBoQmRAFpTRPgE41ARkOrVyi6r3OAXwDrNCw8QiIIACcAQwB3AihqemZaADUmfiEkEDQxSWlZBQQ7N21NInLDH0MjTT5tNwNrWwQ3VyJzRW1DZ0VDbT09cqCQjBwCYmj4xOTGVg5uLNk8iSkZHOLdNyJ2ozc+NybVZ38WxA9nIi8VI8P+w17R3PHwqdiE-CTaebZOXjc2RE+XWRXs2j6RE0zhhymUPWMbkUekM5wQ2lUFR0zk0SO6LjKhmeoQmEWmnySTHw4jAUWWOVWBQ2oGKdnKRH8MIxyKM2jMyjRbIqyhhzgGDW83TcfmJr0mkQ+swAQjEAMYAa1gyDVYHpwLWhU2F2cOxNbnhfEeWmqmkF7JFMPFGOUUr6srC8vJsyYsFVMWQusEK1EBuZ8nsSO0HNFzlUfD83hxaO0fCcfHTuNcfUU0tqQWCIHwqAgcGDHsIwZBhpZ9k03ShorhCL0SJRgsuDfcmj0Fn6KdU7tJxFI5ErobBJVbDZh3ZhfB0dcFqh2w3jg08sbUjUHbwVMy+Y6ZE9Uhkqeh8mLhynNnjcaNOuyRsc0L9jhnnRPzQA */
        id: "polyLine",
        initial: "idle",
        states : {
            idle: {
                on: {
                    MOUSECLICK: {
                        target : "drawing",
                        actions:["createLine"]}

                }
            },

            drawing: {
                on: {
                    MOUSEMOVE: {
                        target: "drawing",
                        actions:["setLastPoint"],
                        internal: true
                    },

                    MOUSECLICK: [{
                        target: "drawing",
                        internal: true,
                        cond: "pasPlein",
                        actions:["addPoint"]
                    }, "idle"],

                    Enter: [{
                        cond:"plusDeDeuxPoints",
                        target:"idle",
                        actions:["saveLine"]
                    }],

                    Backspace: [{
                        target: "drawing",
                        actions:["removeLastPoint"],
                        internal: true,
                        cond: "plusDeDeuxPoints"
                    }],

                    Escape: {
                        target:"idle",
                    actions:["abandon"]}
                }
            }
        }
    },
    // Quelques actions et guardes que vous pouvez utiliser dans votre machine
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                layer.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                layer.batchDraw();
                console.log("point sauvé")
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                layer.batchDraw();
                console.log("ligne sauvée")
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                console.log("point ajouté");
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
                
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                polyline.remove();
                console.log("abandon")
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
                console.log("point enlevé")
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                console.log("pas plein")
                return polyline.points().length < MAX_POINTS * 2;
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                console.log("plus de deux points")
                return polyline.points().length > 6;
                
            },
        },
    }
);

// On démarre la machine
const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();
// On envoie les événements à la machine
stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineService.send(event.key);
});

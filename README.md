# tgm-20

![Example TGM-20 Program](https://media.giphy.com/media/3ohze01bFUSWmbyoKs/giphy.gif)

a faithful emulation of the influential Tile Graphics Machine 20. made for [Recurse Center](https://recurse.com)'s Sprummer 2017 game jam.

## try it out

http://david-lee.net/tgm-20/

## what how do i

- click on the computer's keyboard.
- you can also use `asdfjkl;` on your own keyboard.
- share code with others by hovering over `share your code` and copying what's in the text box.
- run code from others by hovering over `share your code` and pasting their code into the text box.

## documentation

### program structure
a tgm-20 _program_ consists of up to four _layers_.

a _layer_ is a sequence of _commands_. these commands describe an image by applying a sequence transforms to a preset source image.

there are six regular commands in the tgm-20 standard library (detailed below), and two special commands for deleting a command and appending a new layer.

every regular command has two functions:
- when a command is the first command in a layer, it draws a preset source image to the pixel matrix.
- otherwise, it applies a transform to its layer's image.

### command list
- ![#093968](https://placehold.it/15/093968/000000?text=+) `bksp` - special command - removes the last command in the last layer.
- ![#019934](https://placehold.it/15/019934/000000?text=+) `dsnc` - horizontally offsets every other row of pixels
- ![#0099CB](https://placehold.it/15/0099CB/000000?text=+) `miro` - applies symmetry to the pixel matrix
- ![#FF9934](https://placehold.it/15/FF9934/000000?text=+) `colr` - rotates the hue of the entire pixel matrix
- ![#FFFF01](https://placehold.it/15/FFFF01/000000?text=+) `rota` - performs a clockwise rotation around the center pixel
- ![#EB779E](https://placehold.it/15/EB779E/000000?text=+) `incr` - increments the previous command's mod value
- ![#FE0000](https://placehold.it/15/FE0000/000000?text=+) `anim` - animates the previous command's mod value over time
- ![#B844C1](https://placehold.it/15/B844C1/000000?text=+) `layr` - special command - begins a new layer


### mod values
every regular command has a _mod value_. this value changes how each command functions (for both drawing the preset image and for transforming its layer). for example, the mod value of `rota` controls the angle of rotation.

the mod values of a command can be controlled with the `incr` and `anim` commands:
- `incr` simply increments the mod value once. use a string of `incr`s to configure a command.
- `anim` increments the mod value periodically, creating an animation. `anim`'s mod value controls the speed of the animation.

### example

here is an example of a layer with 4 commands:

![code picture](http://i.imgur.com/uCnMDbP.png)

in other words, `dsnc anim colr miro`.

here's the shareable code for that layer (read below to see how to run this on your tgm-20): `slfd`

reading from left to right:
- ![#019934](https://placehold.it/15/019934/000000?text=+)`dsnc` is the source command. it creates a diagonal row of blue pixels.
- ![#FE0000](https://placehold.it/15/FE0000/000000?text=+)`anim` animates the mod value for the `dsnc` source, which has the effect of "stretching" the width of the diagonal line.
- ![#FF9934](https://placehold.it/15/FF9934/000000?text=+)`colr` changes the hue of the line from blue to purple.
- ![#0099CB](https://placehold.it/15/0099CB/000000?text=+)`miro` makes the matrix horizontally symmetric.

## more examples

1. each line is one program. copy the line you want to try out to your clipboard.
2. hover over `share your code` at the bottom of the screen. a text box should appear.
3. paste the code into the text box.

```
dfkkkkkkkkkdkksll
```

```
sjl;sfjll;sffjlll;sfffjllll
```

```
dkkkkjlflkkkk;dkslll
```

```
slsl
```

```
ljkkkkksld
```

```
skkkkksldslllfkkkkk
```

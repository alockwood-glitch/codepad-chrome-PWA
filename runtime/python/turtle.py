import json
import math
import sys


def _emit(event):
    print("__CODEPAD_TURTLE__" + json.dumps(event), file=sys.stderr, flush=True)


def _color(value):
    if len(value) == 0:
        return None
    if len(value) == 1:
        return str(value[0])
    return "rgb({},{},{})".format(*value[:3])


class _Screen:
    def setup(self, *args, **kwargs):
        return None

    def title(self, *args, **kwargs):
        return None

    def bgcolor(self, color=None):
        if color is not None:
            _emit({"type": "background", "color": str(color)})
        return color

    def exitonclick(self):
        return None

    def bye(self):
        return None

    def mainloop(self):
        return None


class Turtle:
    def __init__(self):
        self.x = 0.0
        self.y = 0.0
        self.heading_value = 0.0
        self.pen_is_down = True
        self.pen_color = "#111827"
        self.fill_color = "#111827"
        self.pen_width = 2

    def _move_to(self, x, y):
        old_x = self.x
        old_y = self.y
        self.x = float(x)
        self.y = float(y)
        if self.pen_is_down:
            _emit({
                "type": "line",
                "from": [old_x, old_y],
                "to": [self.x, self.y],
                "color": self.pen_color,
                "width": self.pen_width
            })
        else:
            _emit({"type": "move", "to": [self.x, self.y]})

    def forward(self, distance):
        radians = math.radians(self.heading_value)
        self._move_to(
            self.x + math.cos(radians) * float(distance),
            self.y + math.sin(radians) * float(distance)
        )

    fd = forward

    def backward(self, distance):
        self.forward(-float(distance))

    back = backward
    bk = backward

    def right(self, angle):
        self.heading_value = (self.heading_value - float(angle)) % 360

    rt = right

    def left(self, angle):
        self.heading_value = (self.heading_value + float(angle)) % 360

    lt = left

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._move_to(x, y)

    setpos = goto
    setposition = goto

    def setx(self, x):
        self._move_to(x, self.y)

    def sety(self, y):
        self._move_to(self.x, y)

    def home(self):
        self.goto(0, 0)
        self.heading_value = 0.0

    def setheading(self, angle):
        self.heading_value = float(angle) % 360

    seth = setheading

    def heading(self):
        return self.heading_value

    def position(self):
        return (self.x, self.y)

    pos = position

    def xcor(self):
        return self.x

    def ycor(self):
        return self.y

    def penup(self):
        self.pen_is_down = False

    pu = up = penup

    def pendown(self):
        self.pen_is_down = True

    pd = down = pendown

    def isdown(self):
        return self.pen_is_down

    def pensize(self, width=None):
        if width is None:
            return self.pen_width
        self.pen_width = float(width)

    width = pensize

    def pencolor(self, *args):
        value = _color(args)
        if value is not None:
            self.pen_color = value
        return self.pen_color

    def fillcolor(self, *args):
        value = _color(args)
        if value is not None:
            self.fill_color = value
        return self.fill_color

    def color(self, *args):
        if len(args) == 0:
            return (self.pen_color, self.fill_color)
        self.pencolor(args[0])
        if len(args) > 1:
            self.fillcolor(args[1])

    def speed(self, *args):
        return 0

    def hideturtle(self):
        return None

    ht = hideturtle

    def showturtle(self):
        return None

    st = showturtle

    def shape(self, *args):
        return "classic"

    def clear(self):
        _emit({"type": "clear"})

    def reset(self):
        self.x = 0.0
        self.y = 0.0
        self.heading_value = 0.0
        self.pen_is_down = True
        _emit({"type": "reset"})

    def dot(self, size=8, *color):
        if color:
            dot_color = _color(color)
        else:
            dot_color = self.pen_color
        _emit({
            "type": "dot",
            "x": self.x,
            "y": self.y,
            "size": float(size),
            "color": dot_color
        })

    def circle(self, radius, extent=None, steps=None):
        radius = float(radius)
        extent = 360.0 if extent is None else float(extent)
        steps = int(steps or max(12, abs(extent) // 8))
        start_heading = self.heading_value
        center_angle = math.radians(self.heading_value + (90 if radius >= 0 else -90))
        center_x = self.x + math.cos(center_angle) * abs(radius)
        center_y = self.y + math.sin(center_angle) * abs(radius)
        start_angle = math.atan2(self.y - center_y, self.x - center_x)

        for i in range(1, steps + 1):
            angle = start_angle + math.radians(extent) * (i / steps)
            self._move_to(
                center_x + math.cos(angle) * abs(radius),
                center_y + math.sin(angle) * abs(radius)
            )

        self.heading_value = (start_heading + extent) % 360

    def write(self, text, *args, **kwargs):
        _emit({
            "type": "text",
            "x": self.x,
            "y": self.y,
            "text": str(text),
            "color": self.pen_color
        })

    def begin_fill(self):
        return None

    def end_fill(self):
        return None


_default = Turtle()
_emit({"type": "reset"})


def Screen():
    return _Screen()


def done():
    return None


def mainloop():
    return None


def exitonclick():
    return None


def bye():
    return None


def reset():
    return _default.reset()


def clear():
    return _default.clear()


def forward(distance):
    return _default.forward(distance)


fd = forward


def backward(distance):
    return _default.backward(distance)


back = backward
bk = backward


def right(angle):
    return _default.right(angle)


rt = right


def left(angle):
    return _default.left(angle)


lt = left


def goto(x, y=None):
    return _default.goto(x, y)


setpos = goto
setposition = goto


def setx(x):
    return _default.setx(x)


def sety(y):
    return _default.sety(y)


def home():
    return _default.home()


def setheading(angle):
    return _default.setheading(angle)


seth = setheading


def heading():
    return _default.heading()


def position():
    return _default.position()


pos = position


def xcor():
    return _default.xcor()


def ycor():
    return _default.ycor()


def penup():
    return _default.penup()


pu = up = penup


def pendown():
    return _default.pendown()


pd = down = pendown


def pensize(width=None):
    return _default.pensize(width)


width = pensize


def pencolor(*args):
    return _default.pencolor(*args)


def fillcolor(*args):
    return _default.fillcolor(*args)


def color(*args):
    return _default.color(*args)


def speed(*args):
    return _default.speed(*args)


def hideturtle():
    return _default.hideturtle()


ht = hideturtle


def showturtle():
    return _default.showturtle()


st = showturtle


def shape(*args):
    return _default.shape(*args)


def dot(size=8, *color):
    return _default.dot(size, *color)


def circle(radius, extent=None, steps=None):
    return _default.circle(radius, extent, steps)


def write(text, *args, **kwargs):
    return _default.write(text, *args, **kwargs)


def begin_fill():
    return _default.begin_fill()


def end_fill():
    return _default.end_fill()


__all__ = [
    "Turtle", "Screen", "done", "mainloop", "exitonclick", "bye", "reset", "clear",
    "forward", "fd", "backward", "back", "bk", "right", "rt", "left", "lt",
    "goto", "setpos", "setposition", "setx", "sety", "home", "setheading",
    "seth", "heading", "position", "pos", "xcor", "ycor", "penup", "pu",
    "up", "pendown", "pd", "down", "pensize", "width", "pencolor",
    "fillcolor", "color", "speed", "hideturtle", "ht", "showturtle", "st",
    "shape", "dot", "circle", "write", "begin_fill", "end_fill"
]

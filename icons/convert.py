import os
import subprocess
import shutil


def convert_ico(name):
    files = []
    for size in [256, 128, 64, 32, 16]:
        f = "{}@{}px.png".format(name, size)
        if os.path.exists(f):
            files.append(f)
    print(" ".join(files) + " => " + name + ".ico")
    subprocess.check_call(["convert"] + files + [name + ".ico"])


def convert_icns(name):
    iconset = name + ".iconset"
    try:
        shutil.rmtree(iconset)
    except:
        pass
    os.mkdir(iconset)

    files = []
    for size in [1024, 512, 256, 128, 64, 32, 16]:
        f = "{}@{}px.png".format(name, size)
        if os.path.exists(f):
            shutil.copy(f, os.path.join(
                iconset, "icon_{}x{}.png".format(size, size)))

    subprocess.check_call(["iconutil", "--convert", "icns", iconset])

    try:
        shutil.rmtree(iconset)
    except:
        pass


convert_ico("weiboevents")
convert_icns("weiboevents")

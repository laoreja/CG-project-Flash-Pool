import Image

img = Image.open("surface.png")
new = img.crop((144, 272, 656, 528))
new.save("../tex/surface.png")

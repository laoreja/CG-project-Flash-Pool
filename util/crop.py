import Image

for i in range(1,16):
	name = "ball" + str(i) + ".png"
	img = Image.open(name)
	new = img.crop((68, 34, 580, 290))
	new.save('../tex/' + name)

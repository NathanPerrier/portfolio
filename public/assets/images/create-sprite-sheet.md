# Creating a Sprite Sheet from tv.gif

To properly animate the TV GIF, you need to convert it to a sprite sheet. Here's how:

## Method 1: Using ImageMagick (Command Line)

```bash
# Install ImageMagick if not already installed
brew install imagemagick

# Convert GIF to sprite sheet (8 frames per row)
convert tv.gif -coalesce -append +repage -crop 8x@ +repage +append tv-sprite.png
```

## Method 2: Using FFmpeg

```bash
# Extract frames from GIF
ffmpeg -i tv.gif -vf "scale=380:460,tile=8x4" tv-sprite.png
```

## Method 3: Online Tools

1. Use https://ezgif.com/sprite-sheet
2. Upload tv.gif
3. Set columns to 8
4. Download as tv-sprite.png

## Method 4: Using Python with PIL

```python
from PIL import Image
import math

# Open the GIF
gif = Image.open('tv.gif')

# Get dimensions
frame_width = 380
frame_height = 460
frames_per_row = 8

# Extract frames
frames = []
try:
    while True:
        frames.append(gif.copy())
        gif.seek(len(frames))
except EOFError:
    pass

# Calculate sprite sheet dimensions
total_frames = len(frames)
rows = math.ceil(total_frames / frames_per_row)
sprite_width = frame_width * frames_per_row
sprite_height = frame_height * rows

# Create sprite sheet
sprite_sheet = Image.new('RGBA', (sprite_width, sprite_height))

# Place frames
for i, frame in enumerate(frames):
    row = i // frames_per_row
    col = i % frames_per_row
    x = col * frame_width
    y = row * frame_height
    
    # Resize frame if needed
    frame = frame.resize((frame_width, frame_height), Image.LANCZOS)
    sprite_sheet.paste(frame, (x, y))

# Save
sprite_sheet.save('tv-sprite.png')
```

Once you have tv-sprite.png, place it in /public/assets/images/ and the TV will animate properly!
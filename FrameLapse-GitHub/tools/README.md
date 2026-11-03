# FFmpeg tools

FrameLapse uses local copies of `ffmpeg.exe` and `ffprobe.exe` for completely offline MP4 export.

GitHub does not accept the bundled binaries in a normal repository because each file is larger than 100 MB. Before building FrameLapse, place compatible Windows x64 builds here:

```text
tools/ffmpeg.exe
tools/ffprobe.exe
```

Use a GPL-compatible FFmpeg build and preserve the applicable license, source-offer, and attribution requirements when redistributing it. The project records the build used by the original local package in `licenses/FFmpeg-README.txt` and includes its license in `licenses/FFmpeg-LICENSE.txt`.

These tools are needed only to build/package the app. End users of a properly packaged FrameLapse release do not need to install FFmpeg or access the internet.

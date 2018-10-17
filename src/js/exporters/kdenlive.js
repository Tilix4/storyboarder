// https://www.mltframework.org/docs/mltxml/
const path = require('path')

const Tone = require('tone')

const { msecsToFrames } = require('./common')
const { boardFileImageSize, boardFilenameForExport } = require('../models/board')
const util = require('../utils')

// kdenlive templating
const clipItem = data =>
`
          <producer title="${data.id}" id="${data.masterClipId}"" in="${data.start}" out="${data.end}">
            <property name="length">${data.duration}</property>
            <property name="eof">pause</property>
            <property name="resource">/home/felix/Downloads/Image2.jpg</property>
            <property name="ttl">${data.timebase}</property>
            <property name="aspect_ratio">1</property>
            <property name="progressive">1</property>
            <property name="seekable">1</property>
            <property name="loop">1</property>
            <property name="meta.media.width">${data.fileWidth}</property>
            <property name="meta.media.height">${data.fileHeight}</property>
            <property name="mlt_service">pixbuf</property>
            <property name="kdenlive:clipname"/>
            <property name="kdenlive:duration">125</property>
            <property name="kdenlive:id">9</property>
            <property name="kdenlive:file_size">115654</property>
            <property name="kdenlive:file_hash">d869d608ab55c8505faafac3aafbbe2e</property>
            <property name="kdenlive:folderid">-1</property>
            <property name="global_feed">1</property>
            <property name="kdenlive:zone_in">${data.start}</property>
            <property name="kdenlive:zone_out">${data.end}</property>
          </producer>
`

const stereoTrack = data => `
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="25" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
    ${data.audioClips.filter(c => c.numberOfChannels == 1).map(c => audioClip(Object.assign(c, { currentExplodedTrackIndex: 0 }))).join('\n')}
    ${data.audioClips.filter(c => c.numberOfChannels  > 1).map(c => audioClip(Object.assign(c, { currentExplodedTrackIndex: 0 }))).join('\n')}
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>1</outputchannelindex>
        </track>
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="25" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="1" totalExplodedTrackCount="2" premiereTrackType="Stereo">
    ${data.audioClips.filter(c => c.numberOfChannels  > 1).map(c => audioClip(Object.assign(c, { currentExplodedTrackIndex: 1 }))).join('\n')}
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>2</outputchannelindex>
        </track>
`

const audioClipFile = data =>
  data.numberOfChannels == 1 || data.currentExplodedTrackIndex === 0
  ? `
            <file id="file-${data.audioIndexPos}">
              <name>${data.filename}</name>
              <pathurl>${data.pathurl}</pathurl>
              <rate>
                <timebase>${data.timebase}</timebase>
                <ntsc>${data.ntsc}</ntsc>
              </rate>
              <duration>${data.duration}</duration>
              <timecode>
                <rate>
                  <timebase>${data.timebase}</timebase>
                  <ntsc>${data.ntsc}</ntsc>
                </rate>
                <string>00;00;00;00</string>
                <frame>0</frame>
                <displayformat>DF</displayformat>
                <reel>
                  <name></name>
                </reel>
              </timecode>
              <media>
                <audio>
` +
/*`                  <samplecharacteristics>
                    <depth>${data.bitDepth}</depth>
                    <samplerate>${data.sampleRate}</samplerate>
                  </samplecharacteristics>` + */
`                  <channelcount>${data.numberOfChannels}</channelcount>
` +
/*`                  <audiochannel>
                    <sourcechannel>1</sourcechannel>
                  </audiochannel>`*/
`                </audio>
              </media>
            </file>
`
: `<file id="file-${data.audioIndexPos}" />`

const audioClip = data => `
          <clipitem id="clipindex-${data.audioIndexPos + data.currentExplodedTrackIndex}" premiereChannelType="${data.numberOfChannels == 1 ? 'mono' : 'stereo'}">
            <masterclipid>${`masterclip-${data.audioIndexPos}`}</masterclipid>
            <name>${data.name}</name>
            <enabled>TRUE</enabled>
            <duration>${data.duration}</duration>
            <rate>
              <timebase>${data.timebase}</timebase>
              <ntsc>${data.ntsc}</ntsc>
            </rate>
            <start>${data.start}</start>
            <end>${data.end}</end>
            <in>${data.in}</in>
            <out>${data.out}</out>
            <pproTicksIn>${data.pproTicksIn}</pproTicksIn>
            <pproTicksOut>${data.pproTicksOut}</pproTicksOut>

            ${audioClipFile(data)}

            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>${data.currentExplodedTrackIndex + 1}</trackindex>
            </sourcetrack>

            ${
              data.numberOfChannels > 1
              ? `<link>
                <linkclipref>clipindex-${data.audioIndexPos}</linkclipref>
              </link>
              <link>
                <linkclipref>clipindex-${data.audioIndexPos + 1}</linkclipref>
              </link>`
              : ''
            }

            <logginginfo>
              <description></description>
              <scene></scene>
              <shottake></shottake>
              <lognote></lognote>
            </logginginfo>
            <labels>
              <label2>Caribbean</label2>
            </labels>
          </clipitem>`

const generateKdenliveXml = data =>
`<?xml version='1.0' encoding='utf-8'?>
<mlt title="${data.sequenceId}" LC_NUMERIC="fr_FR" producer="main bin" version="6.7.0" root="C:/Users/fdavid/Documents">
 <profile frame_rate_num="25" sample_aspect_num="1" display_aspect_den="9" colorspace="709" progressive="1" description="HD 1080p 25 fps" display_aspect_num="16" frame_rate_den="1" width="1920" height="1080" sample_aspect_den="1"/>
 <playlist id="main bin">
  <property name="kdenlive:docproperties.audiotargettrack">2</property>
  <property name="kdenlive:docproperties.decimalPoint">,</property>
  <property name="kdenlive:docproperties.dirtypreviewchunks"/>
  <property name="kdenlive:docproperties.disablepreview">0</property>
  <property name="kdenlive:docproperties.documentid">1539610839928</property>
  <property name="kdenlive:docproperties.enableproxy">0</property>
  <property name="kdenlive:docproperties.generateimageproxy">0</property>
  <property name="kdenlive:docproperties.generateproxy">0</property>
  <property name="kdenlive:docproperties.kdenliveversion">18.04.1</property>
  <property name="kdenlive:docproperties.position">0</property>
  <property name="kdenlive:docproperties.previewchunks"/>
  <property name="kdenlive:docproperties.previewextension"/>
  <property name="kdenlive:docproperties.previewparameters"/>
  <property name="kdenlive:docproperties.profile">atsc_1080p_25</property>
  <property name="kdenlive:docproperties.proxyextension">mkv</property>
  <property name="kdenlive:docproperties.proxyimageminsize">2000</property>
  <property name="kdenlive:docproperties.proxyminsize">1000</property>
  <property name="kdenlive:docproperties.proxyparams">-vf yadif,scale=960:-2 -qscale 3 -vcodec mjpeg -acodec pcm_s16le</property>
  <property name="kdenlive:docproperties.version">0.96</property>
  <property name="kdenlive:docproperties.verticalzoom">1</property>
  <property name="kdenlive:docproperties.videotargettrack">3</property>
  <property name="kdenlive:docproperties.zonein">0</property>
  <property name="kdenlive:docproperties.zoneout">100</property>
  <property name="kdenlive:docproperties.zoom">7</property>
  <property name="kdenlive:documentnotes"/>
  <property name="kdenlive:clipgroups"/>
  <property name="xml_retain">1</property>
 </playlist>
 <producer id="black" in="0" out="500">
  <property name="length">15000</property>
  <property name="eof">pause</property>
  <property name="resource">black</property>
  <property name="aspect_ratio">0</property>
  <property name="mlt_service">colour</property>
  <property name="set.test_audio">0</property>
 </producer>
 <playlist id="black_track">
  <entry producer="black" in="0" out="1"/>
 </playlist>
 <playlist id="playlist1">
  <property name="kdenlive:audio_track">1</property>
  <property name="kdenlive:track_name">Audio 2</property>
 </playlist>
 <playlist id="playlist2">
  <property name="kdenlive:audio_track">1</property>
  <property name="kdenlive:track_name">Audio 1</property>
 </playlist>
 <playlist id="playlist3">
  <property name="kdenlive:track_name">Video 1</property>
 </playlist>
 <playlist id="playlist4">
  <property name="kdenlive:track_name">Video 2</property>
 </playlist>
 <playlist id="playlist5">
  <property name="kdenlive:track_name">Video 3</property>
 </playlist>
 <tractor title="Anonymous Submission" id="maintractor" global_feed="1" in="0" out="1">
  <track producer="black_track"/>
  <track hide="video" producer="playlist1"/>
  <track hide="video" producer="playlist2"/>
  <track producer="playlist3"/>
  <track producer="playlist4"/>
  <track producer="playlist5"/>
  <transition id="transition0">
   <property name="a_track">0</property>
   <property name="b_track">1</property>
   <property name="mlt_service">mix</property>
   <property name="always_active">1</property>
   <property name="sum">1</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition1">
   <property name="a_track">0</property>
   <property name="b_track">2</property>
   <property name="mlt_service">mix</property>
   <property name="always_active">1</property>
   <property name="sum">1</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition2">
   <property name="a_track">0</property>
   <property name="b_track">3</property>
   <property name="mlt_service">mix</property>
   <property name="always_active">1</property>
   <property name="sum">1</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition3">
   <property name="a_track">0</property>
   <property name="b_track">3</property>
   <property name="compositing">0</property>
   <property name="distort">0</property>
   <property name="rotate_center">0</property>
   <property name="mlt_service">qtblend</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition4">
   <property name="a_track">0</property>
   <property name="b_track">4</property>
   <property name="mlt_service">mix</property>
   <property name="always_active">1</property>
   <property name="sum">1</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition5">
   <property name="a_track">0</property>
   <property name="b_track">4</property>
   <property name="compositing">0</property>
   <property name="distort">0</property>
   <property name="rotate_center">0</property>
   <property name="mlt_service">qtblend</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition6">
   <property name="a_track">0</property>
   <property name="b_track">5</property>
   <property name="mlt_service">mix</property>
   <property name="always_active">1</property>
   <property name="sum">1</property>
   <property name="internal_added">237</property>
  </transition>
  <transition id="transition7">
   <property name="a_track">0</property>
   <property name="b_track">5</property>
   <property name="compositing">0</property>
   <property name="distort">0</property>
   <property name="rotate_center">0</property>
   <property name="mlt_service">qtblend</property>
   <property name="internal_added">237</property>
  </transition>
 </tractor>
</mlt>
`

const sanitizeNameString = function (nameString) {
    return nameString.replace(/&/g, '+')
               .replace(/</g, '-')
               .replace(/>/g, '-')
               .replace(/"/g, '')
               .replace(/'/g, '')
               .replace(/\//g, '');
  };

// via https://forums.adobe.com/message/8161911#8161911
// 1 s = 254016000000 ticks
// "This value is not guaranteed to remain the same from version to version."
const pproTicksForFrames = (fps, frames) => frames / fps * 254016000000

const generateKdenliveData = async (boardData, { projectFileAbsolutePath, outputPath }) => {
  let [width, height] = boardFileImageSize(boardData)

  let dirname = path.dirname(projectFileAbsolutePath)

  let extname = path.extname(projectFileAbsolutePath)
  let basenameWithoutExt = path.basename(projectFileAbsolutePath, extname)

  // fps is always rounded up
  let timebase = Math.ceil(boardData.fps)
  // ntsc is set true if fps is a decimal, false if fps is an integer
  let ntsc = boardData.fps % 1 > 0
    ? 'TRUE'
    : 'FALSE'

  let clipItems = []
  let currFrame = 0
  let index = 0
  let currAudioIndex = 0
  let timelinePosInMsecs = 0
  let stereoTracks = [ { endInMsecs: 0, audioClips: [] }]
  for (let board of boardData.boards) {
    let fileFilename = util.dashed(boardFilenameForExport(board, index, basenameWithoutExt)),
        filePathUrl = `./${encodeURI(fileFilename)}` //`file://${outputPath}/${fileFilename}`

    let duration = (util.isUndefined(board.duration) || board.duration == 0)
                     ? boardData.defaultBoardTiming
                     : board.duration

    let lastFrame = Math.round(msecsToFrames(boardData.fps, duration)),
        endFrame = currFrame + lastFrame

    let clipItem = {
      start: currFrame,
      end: endFrame,

      id: `clipitem-${index + 1}`,
      masterClipId: `masterclip-${index + 1}`,

      // set name if dialogue or action, otherwise filename
      name: board.dialogue
              ? sanitizeNameString(board.dialogue)
              : board.action
                ? sanitizeNameString(board.action)
                : fileFilename,

      description: board.notes
                     ? sanitizeNameString(board.notes)
                     : '',

      duration: 1294705, // ???
      timebase,
      ntsc,

      fileId: `file-${index + 1}`,
      fileFilename,
      filePathUrl,

      fileWidth: width,
      fileHeight: height,

      label2: 'Lavender'
    }
    clipItems.push(clipItem)

    if (board.audio && board.audio.filename && board.audio.filename.length) {
      let filepath = path.join(dirname, 'images', board.audio.filename)
      let buffer

      try {
        buffer = await new Tone.Buffer().load(filepath)
      } catch (err) {
        console.error(err)
        throw new Error(`could not load audio file ${board.audio.filename}`)
      }

      // buffer.length               // length in samples, e.g. 44788
      // buffer.duration             // duration in seconds, e.g. 0.933...
      // buffer._buffer.sampleRate   // sample rate
      // buffer.numberOfChannels     // number of channels (0 if not loaded)

      // read the values
      let audioDurationInMsecs = Math.round(buffer.duration * 1000)
      let bitDepth = -1
      let sampleRate = buffer._buffer.sampleRate
      let numberOfChannels = buffer.numberOfChannels

      let audioEndFrame = currFrame + Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs))

      let audioClip = {
        name: board.audio.filename,

        duration: msecsToFrames(boardData.fps, audioDurationInMsecs),

        timebase: timebase,
        ntsc: ntsc,

        start: currFrame,
        end: audioEndFrame,
        in: 0,
        out: Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs)),

        pproTicksIn: pproTicksForFrames(boardData.fps, 0),
        pproTicksOut: pproTicksForFrames(boardData.fps, Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs))),

        filename: board.audio.filename,
        pathurl: `./${board.audio.filename}`, // `file://localhost${path.join(dirname, board.audio.filename)}`,

        bitDepth: bitDepth,
        sampleRate: sampleRate,

        numberOfChannels: numberOfChannels,

        audioIndexPos: currAudioIndex + boardData.boards.length + 1
      }

      let nextAvailableTrackIndex = stereoTracks.length
      for (let i = 0; i < stereoTracks.length; i++) {
        let time = stereoTracks[i].endInMsecs
        if (timelinePosInMsecs >= time) {
          nextAvailableTrackIndex = i
          break
        }
      }

      stereoTracks[nextAvailableTrackIndex] = stereoTracks[nextAvailableTrackIndex] || {}
      stereoTracks[nextAvailableTrackIndex].audioClips = stereoTracks[nextAvailableTrackIndex].audioClips || []
      stereoTracks[nextAvailableTrackIndex].endInMsecs = timelinePosInMsecs + audioDurationInMsecs

      stereoTracks[nextAvailableTrackIndex].audioClips.push(audioClip)

      currAudioIndex = currAudioIndex + 2
    }

    timelinePosInMsecs += duration

    currFrame = endFrame
    index++
  }

  return {
    sequenceId: 'sequence-1',
    uuid: util.uuid4(),
    width: width,
    height: height,
    clipItems: clipItems,
    stereoTracks: stereoTracks,

    timebase,
    ntsc
  }
}

module.exports = {
  generateKdenliveData,
  generateKdenliveXml
}

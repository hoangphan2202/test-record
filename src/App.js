import './App.css';
import React, {  useEffect, useMemo, useRef, useState } from "react";
import { assembleAuthUrl } from "./getUrl";
import { VideoStreamMerger } from "video-stream-merger";
import usePlaySound from "./hooks/usePlaySound";
import audioBufferToWav from "audiobuffer-to-wav";

export function processData(
    data) {
  for (const entry of data) {
    if (entry.pgs === 'rpl') {
      const start = entry?.rg?.[0];
      const end = entry?.rg?.[1];
      if (start && end) {
        const sliceData = data?.slice(start - 1, end);
        for (const item of sliceData) {
          if (data[item.index]) {
            data[item.index].status = 'deleted';
          }
        }
      }
    }
  }

  return data
      .filter((item) => item.status !== 'deleted')
      .map((item) => item.text)
      .join('')
      .trim();
}

export function formatData(data) {
  let formattedData = [];

  data.forEach((entry) => {
    // if (!entry?.data?.result?.pgs) {
    //   return;
    // }
    const pgs = entry.data.result.pgs;
    const text = entry?.data?.result?.ws?.flatMap((ws) => ws?.cw?.map((cw) => cw?.w))?.join('');
    if (pgs === 'rpl') {
      return formattedData.push({
        text: text,
        pgs: 'rpl',
        rg: entry?.data?.result?.rg,
        index: entry.data.result.sn - 1,
      });
    }
    return formattedData.push({
      text: text,
      pgs: 'apd',
      index: entry.data.result.sn - 1,
    });
  });

  formattedData.sort((a, b) => {
    return a?.index - b?.index;
  });

  if (formattedData?.length < formattedData[formattedData.length - 1].index + 1) {
    for (let i = 0; i < formattedData[formattedData.length - 1].index; i++) {
      if (!formattedData.some((element) => element.index === i)) {
        formattedData.push({
          text: '',
          pgs: 'apd',
          index: i,
        });
      }
    }
    formattedData.sort((a, b) => {
      return a.index - b.index;
    });
  }
  return formattedData;
}


function App() {
  const [recording, setRecording] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [microphoneSource, setMicrophoneSource] = useState(null);
  const [scriptNode, setScriptNode] = useState(null);
  const [fileRecorded, setFileRecorded] = useState(null);
  const [myStream, setMyStream] = useState(null);
  // const { socket } = useSocket();
  const audioRef = useRef(null);
  const audioRecordRef = useRef(null);
  const [data, setData] = useState([]);
  const [prevData, setPrevData] = useState([]);
  const [webSocket, setWebSocket] = useState(null);
  const [audioMerger, setAudioMerger] = useState(null);
  const {onSpeak} = usePlaySound();
  const [shouldSend, setShouldSend] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState(null);
  const [isFilter, setIsFilter] = useState(true);
  const audioContextRef = useRef();
  const audioInputRef = useRef();
  const processorRef = useRef();
  const setupAudioProcessing = async () => {
    try {
        const ws = new WebSocket(assembleAuthUrl('wss://iat-api-sg.xf-yun.com/v2/iat','dd18aa1ba84c912506c346f5ab04dff3','7141c8e65ebe846eddcb0d89ed0ac4a6'));
        setWebSocket(ws);
        const audioRecordStream = await navigator.mediaDevices.getUserMedia({ audio: {
            sampleRate: 16000,
            sampleSize: 16,
            channelCount: 1,
            echoCancellation: isFilter,
            noiseSuppression: isFilter,
          } });
        const mediaRecorder = new MediaRecorder(audioRecordStream);
        setVoiceRecorder(mediaRecorder);

      ws.onopen = async () => {
          try {
            console.log('WebSocket connection opened');
            ws.send(
                JSON.stringify({
                  common: { app_id: 'ga35ac31' },
                  business: {
                    language: 'vi_VN',
                    domain: 'iat',
                    accent: 'mandarin',
                    sample_rate: '16000',
                    vad_eos: 1500,
                    dwa: 'wpgs',
                  },
                  data: { status: 0, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
                })
            );

            if (audioRef.current) {
              audioRef.current.play();
            }
            const audioMerger = new VideoStreamMerger();
            audioMerger.start();
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: {
                sampleRate: 16000,
                sampleSize: 16,
                channelCount: 1,
                echoCancellation: isFilter,
                noiseSuppression: isFilter,
              } });

            const audioMediaSource = audioRef?.current?.captureStream();
            const audioTrack = audioMediaSource?.getAudioTracks();
            const streamTrack = audioStream?.getAudioTracks();

            streamTrack?.map((track) => {
              console.log("streamTrack");
              console.log(track);
              track.enabled = true;
            })

            audioTrack?.map(async(track) => {
              console.log("audioTrack");
              console.log(track);
              // try {
              //   audioMediaSource.removeTrack(track);
              //   // Let it go
              //   track.stop();
              // }catch (e) {
              //   console.log(e);
              // }
              track.enabled = false;
            })

            audioMerger.addStream(audioStream);
            if (audioMediaSource){
              console.log("audioStream");
              console.log(audioStream);
              console.log("audioMediaSource");
              console.log(audioMediaSource);
              audioMerger.addStream(audioMediaSource);
            }

            setMyStream(audioStream);
            setAudioMerger(audioMerger);

            // // Giả sử `currentStream` là MediaStream hiện tại, bao gồm cả âm thanh từ microphone và audio đang phát
            // const currentStream = audioMerger.result;
            //
            // // Lấy tất cả các audio track
            // const audioTracks = currentStream.getAudioTracks();
            //
            // // Lọc ra các audio track từ microphone
            // const microphoneTracks = audioTracks.filter(track => {
            //   console.log("microphoneTracks");
            //   console.log(track);
            //  // return  track.kind === 'audio' && track.label.includes('microphone')
            //  return  track
            // });
            //
            // // Tạo một MediaStream mới chỉ chứa các track từ microphone
            // const microphoneStream = new MediaStream(microphoneTracks);

            audioContextRef.current = new window.AudioContext();

            await audioContextRef.current.audioWorklet.addModule(
                "/src/worklets/recorderWorkletProcessor.js"
            );

            audioContextRef.current.resume();

            // if (microphoneStream.getAudioTracks().length > 0) {
              audioInputRef.current = audioContextRef.current.createMediaStreamSource(audioMerger.result);
              processorRef.current = new AudioWorkletNode(
                  audioContextRef.current,
                  "recorder.worklet"
              );

              processorRef.current.connect(audioContextRef.current.destination);
              audioContextRef.current.resume();

              audioInputRef.current.connect(processorRef.current);

              processorRef.current.port.onmessage = (event) => {
                const inputData = event.data;
                var base64 = btoa(
                    new Uint8Array(inputData)
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                ws.send(
                    JSON.stringify({
                      data: {
                        status: 1,
                        format: 'audio/L16;rate=16000',
                        encoding: 'raw',
                        audio: base64,
                      },
                    })
                )
              };

            // } else {
            //   console.error('No audio tracks in the microphone stream');
            // }

            // const _microphoneSource = _audioContext.createMediaStreamSource(audioMerger.result);
            // const _scriptNode = _audioContext.createScriptProcessor(4096, 1, 1);
            // _scriptNode.onaudioprocess = function(event) {
            //   const inputData = event.inputBuffer.getChannelData(0);
            //   const buffer = new Int16Array(inputData.length);
            //
            //   for (let i = 0; i < inputData.length; i++) {
            //     buffer[i] = inputData[i] * 0x7fff;
            //   }
            //
            //   // Convert audio data to Uint8Array
            //   const uint8ArrayData = new Uint8Array(buffer.buffer);
            //
            //   // Convert Uint8Array to base64
            //   let binary = '';
            //   uint8ArrayData.forEach(function(byte) {
            //     binary += String.fromCharCode(byte);
            //   });
            //   const base64Data = btoa(binary);
            //   ws.send(
            //       JSON.stringify({
            //         data: {
            //           status: 1,
            //           format: 'audio/L16;rate=16000',
            //           encoding: 'raw',
            //           audio: base64Data,
            //         },
            //       })
            //   )
            //
            //   // socket.emit('audio_stream', { audio: base64Data, end: false });
            //   // Your base64 audio data is now available for processing or handling
            // };
            // _microphoneSource.connect(_scriptNode);
            // _scriptNode.connect(_audioContext.destination);
            // setAudioContext(_audioContext);
            // setMicrophoneSource(_microphoneSource);
            // setScriptNode(_scriptNode);
          } catch (e) {
            console.log(e);
            // setConnectingWebSocket(false);
          }
        };
        ws.onerror = (e) => {
          // an error occurred
          console.log("e");
          console.log(e);
          ws.close()
          // setIsRecording(false);
          // setConnectingWebSocket(false);
        };
        ws.onmessage = async (e) => {
          const data = JSON.parse(e.data);
          if (data?.code === 0 && data?.message === 'success') {
            setData((prevState) => [...prevState, data]);
            ;
          }
          if (data?.data?.status === 2) {
            try {
              setRecording(false);
              setShouldSend(true);
              setWebSocket(null);
              microphoneSource?.disconnect();
              scriptNode?.disconnect();
              audioContext?.close();
              stopRecording(audioRecordStream, mediaRecorder)
              setPrevData(data)
              setData((prevState) => {
                setPrevData(prevState)
                return []
              });
              ws.close()
              // const tracks = myStream.getAudioTracks();
              // for (const track of tracks) {
              //   track.stop();
              // }
              // voiceRecorder.stop();
              // setVoiceRecorder(null);
              // setData([])
            } catch (error) {
              ws.close()

              console.log('Error stopping recording:', error);
            }
          }
        };


    } catch (error) {
      console.error('Error accessing microphone or setting up audio processing:', error);
    }
  };

  const stopRecording = (audioRecordStream, voiceRecorder) => {
   try {
     const tracks = audioRecordStream.getAudioTracks();
     for (const track of tracks) {
       track.stop();
     }
     voiceRecorder.stop();
     setVoiceRecorder(null);
   }catch (e) {
     console.log(e);
   }
  }

  const onClick = () => {
    try {
      if (recording) {
        microphoneSource?.disconnect();
        scriptNode?.disconnect();
        audioContext?.close();
        webSocket.send(
            JSON.stringify({
              data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
            })
        )
        setData([]);
      } else {
        // start recording
        setupAudioProcessing();
      }
      setRecording(!recording);

    }catch (e) {
      console.log(e);
    }
  };

  const speakingText = useMemo(() => {
    if (data?.length) {
      // @ts-ignore
      return processData(formatData(data));
    }
    return '';
  }, [data]);

  const speakingTextPrev = useMemo(() => {
    if (prevData?.length) {
      // @ts-ignore
      return processData(formatData(prevData));
    }
    return '';
  }, [prevData]);


  // useEffect(() => {
  //   if (shouldSend) {
  //     // sendData?.();
  //     setShouldSend(false);
  //     setData([]);
  //     onSpeak(speakingText);
  //     // startRecording();
  //   }
  // }, [shouldSend, speakingText])

  /**
   * This hook is triggered when we start the recording
   */
  React.useEffect(() => {
   const check = async () => {
    try {
      if (!recording || !voiceRecorder) return;

      voiceRecorder.start();

      voiceRecorder.ondataavailable = ({ data }) => {
        // const audioBlob = event.data;
        const reader = new FileReader();
        reader.readAsArrayBuffer(data);
        reader.onloadend = function() {
          const audioData = reader.result;
          const audioContext = new AudioContext();
          audioContext.decodeAudioData(audioData, function(decodedData) {
            const wavData = audioBufferToWav(decodedData);
            const wavBlob = new Blob([wavData], { type: 'audio/wav' });
            audioRef.current.src = URL.createObjectURL(wavBlob);
            audioRef.current.play();
          });
        };
      };
    }catch (e) {
      console.log("e");
      console.log(e);
    }
   }

   check()
  }, [recording, voiceRecorder]);

  return (
    <div className="App">
      <header className="App-header">
        <audio
            ref={audioRef}
            // src="/voice-noise.wav"
            // autoPlay={true}
            controls={true}
            controlsList="nodownload"
        />
        <p>Prev speakingText</p>
        <p>{speakingTextPrev}</p>
        <p>------------------</p>
        <p>speakingText</p>
        <p>{speakingText}</p>

        {/*{audioMerger?.result && (*/}
        {/*    <>*/}
        {/*      <h1>My Stream</h1>*/}
        {/*      <ReactPlayer*/}
        {/*          playing*/}
        {/*          // muted*/}
        {/*          height="100px"*/}
        {/*          width="200px"*/}
        {/*          url={audioMerger.result}*/}
        {/*      />*/}
        {/*    </>*/}
        {/*)}*/}

        <button onClick={onClick} style={{
          padding: '10px 20px',
          backgroundColor: recording ? 'red' : 'blue',
        }}>
          {recording ? "Stop" : "Start"} Recording
        </button>
        <p>Filter: {isFilter ? 'active' : 'inactive'}</p>
        <button onClick={() => setIsFilter(!isFilter)}>Toggle Filter</button>
      </header>
    </div>
  );
}

export default App;

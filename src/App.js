import './App.css';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AudioRecorder from "./components/AudioRecorder";
import { useSocket } from "./hooks/useSocket";
import ReactPlayer from "react-player";
import { assembleAuthUrl } from "./getUrl";

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
  const [texts, setTexts] = useState([]);
  const audioRef = useRef(null);
  const audioRecordRef = useRef(null);
  const fileRef = useRef(null);
  const [data, setData] = useState([]);
  const [webSocket, setWebSocket] = useState(null);

  const setupAudioProcessing = async () => {
    try {
        const ws = new WebSocket(assembleAuthUrl('wss://iat-api-sg.xf-yun.com/v2/iat','dd18aa1ba84c912506c346f5ab04dff3','7141c8e65ebe846eddcb0d89ed0ac4a6'));
      setWebSocket(ws);
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
            // Start processing audio chunks;
            // Set up WebRTC with echo cancellation
            const stream = await navigator.mediaDevices.getUserMedia({ audio: {  sampleRate: 16000, } });
            setMyStream(stream);
            // Set up Web Audio API for noise suppression
            const _audioContext = new (window.AudioContext || window.webkitAudioContext)({
              sampleRate: 16000, // Set the sample rate to 16000
            });
            const _microphoneSource = _audioContext.createMediaStreamSource(stream);
            const _scriptNode = _audioContext.createScriptProcessor(4096, 1, 1);
            _scriptNode.onaudioprocess = function(event) {
              const inputData = event.inputBuffer.getChannelData(0);
              const buffer = new Int16Array(inputData.length);

              for (let i = 0; i < inputData.length; i++) {
                buffer[i] = inputData[i] * 0x7fff;
              }

              // Convert audio data to Uint8Array
              const uint8ArrayData = new Uint8Array(buffer.buffer);

              // Convert Uint8Array to base64
              let binary = '';
              uint8ArrayData.forEach(function(byte) {
                binary += String.fromCharCode(byte);
              });
              const base64Data = btoa(binary);
              // const audio = new Audio(`data:audio/wav;base64,${base64Data}`);
              // audio.play();
              ws.send(
                  JSON.stringify({
                    data: {
                      status: 1,
                      format: 'audio/L16;rate=16000',
                      encoding: 'raw',
                      audio: base64Data,
                    },
                  })
              )

              // socket.emit('audio_stream', { audio: base64Data, end: false });
              // Your base64 audio data is now available for processing or handling
            };
            _microphoneSource.connect(_scriptNode);
            _scriptNode.connect(_audioContext.destination);
            setAudioContext(_audioContext);
            setMicrophoneSource(_microphoneSource);
            setScriptNode(_scriptNode);
          } catch (e) {
            console.log(e);
            // setConnectingWebSocket(false);
          }
        };
        ws.onerror = (e) => {
          // an error occurred
          console.log("e");
          console.log(e);
          // setIsRecording(false);
          // setConnectingWebSocket(false);
        };
        ws.onmessage = async (e) => {
          console.log(e.data);
          const data = JSON.parse(e.data);
          if (data?.code === 0 && data?.message === 'success') {
            setData((prevState) => [...prevState, data]);
          }
          if (data?.data?.status === 2) {
            try {
              stopRecording();
              // if (data?.data?.result?.ws[0]?.cw?.[0]?.w === '') {
              //   onEndWithoutData?.();
              // }
              // await AudioRecord.stop();
              // await audioRecorderPlayer.stopRecorder();
              // audioRecorderPlayer.removeRecordBackListener();
              // setIsRecording(false);
              // setShouldSend(true);
              // setMetering(0);
              // setWebSocket(null);
              // onEnd?.();
            } catch (error) {
              console.error('Error stopping recording:', error);
            }
          }
        };


    } catch (error) {
      console.error('Error accessing microphone or setting up audio processing:', error);
    }
  };

  const playAudioFromBase64 = (base64Data) => {
    try {
      const decodedData = atob(base64Data);
      console.log("decodedData");
      console.log(decodedData);
      const audio = new Audio(`data:audio/wav;base64,${decodedData}`);

      // audio.play();
    }catch (e) {
      console.log(e);
    }
  };


  const playAudioFile = useCallback((base64Data) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decodedData = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(decodedData.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < decodedData.length; i++) {
      view[i] = decodedData.charCodeAt(i);
    }
    audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }, function(err) {
      console.error('Error decoding audio data:', err);
    });
  }, [audioContext]);

  const stopRecording = () => {
    microphoneSource?.disconnect();
    scriptNode?.disconnect();
    audioContext?.close();
    webSocket.send(
        JSON.stringify({
          data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
        })
    )
    setData([]);
  }

  const onClick = () => {
    try {
      if (recording) {
        console.log(fileRecorded);
        // stop recording
        // socket.emit('audio_stream', { audio: '', end: true });
        microphoneSource?.disconnect();
        scriptNode?.disconnect();
        audioContext?.close();
        webSocket.send(
            JSON.stringify({
              data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
            })
        )
        setData([]);
        // playAudioFile(fileRecorded)
      } else {
        // start recording
        setupAudioProcessing();
      }
      setRecording(!recording);
    }catch (e) {
      console.log(e);
    }
  };

  // useEffect(() => {
  //   if (socket) {
  //     socket.on('data', (data) => {
  //       console.log('data received:');
  //       console.log(data)
  //       if (data?.audio) {
  //         playAudioFile(data.audio);
  //       }
  //       if (data?.text_translate) {
  //         setTexts((prev) => [...prev, data.text_translate]);
  //       }
  //     });
  //   }
  // }, [socket])

  function downloadAudio() {
    const link = document.createElement('a');
    link.href = audioRecordRef.current.src;
    link.download = 'audio.wav';
    link.click();
  }

  const playAudio = (e) => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.play();

      const audio = audioRef.current

      audio.onplay = (e) => {
        // When seek to begin of audio
        if ( e.target.currentTime === 0 ) {
          console.log('When seek to begin of audio');
          return;
        }
        // When seek any where
        if ( e.target.currentTime !== 0 ) {
          console.log('When seek any where');
          return;
        }
        console.log('Audio play first time from 0');
        const audioMediaSource = audioRef.captureStream();

        audioMediaSource.then((backgroundAudioStream) => {
          const videoTracks = backgroundAudioStream.getVideoTracks();
          if ( videoTracks.length > 0 ) {
            videoTracks.map( videoTrack => {
              backgroundAudioStream.removeTrack(videoTrack);
              // Let it go
              videoTrack.stop();
            });
          }
        })
        // const audioTrack = backgroundAudioStream.getAudioTracks()[0];
        // if ( audioTrack ) {
        //   this.localBackgroundAudioTrack = audioTrack;
        //
        //   // Handle for Presenter: add to Presenter media stream via audioMerger
        //   const audioMerger = this.audioMerger;
        //   if ( audioMerger && audioMerger.started && backgroundAudioStream ) {
        //     audioMerger.addStream( backgroundAudioStream );
        //   }
        //
        //   // Handle for Viewer peer connections
        //   // Use to push to viewer peerConnection when make invite connection or replace if the viewer peerConnection already existed
        //   // Cannot use current audioMerger result because it contain viewer audio
        //   // Create new audio merger for connection to viewer
        //   // Just merge audio
        //   // Create new audio merger for localAudio and background audio
        //   const inviteAudioMerger = this.inviteAudioMerger = new VideoStreamMerger();
        //   inviteAudioMerger.addStream(backgroundAudioStream);
        //   inviteAudioMerger.addStream(this.localAudioStream);
        //   // Start the merging. Calling this makes the result available to us
        //   inviteAudioMerger.start();
        //   // Note: when presenter share audio and connect to viewer after that, let get audio from
        //   // inviteAudioMerger to use in antWebRTCMediaStream
        //
        //   const newAudioTrack = inviteAudioMerger.result.getAudioTracks()[0];
        //   Object.values(this.peerConnections).map( async peerConnection => {
        //     const presenterMediaStream = peerConnection.getLocalPresenterStream();
        //     if ( presenterMediaStream ) {
        //       const currentPresenterAudioTrack = presenterMediaStream.getAudioTracks()[0];
        //       await peerConnection.replaceTrack(currentPresenterAudioTrack, newAudioTrack);
        //     }
        //   });
        //
        //   // Change the audio share state when all things done
        //   setTimeout(() => {
        //     // Cause by if the user seek right after the audio input appear
        //     // Sometime we got quiet sound, so just display the audio input after 1s to prevent it
        //     console.log('setIsAudioShared:', shareAudio);
        //     this.props.setIsAudioShared(shareAudio);
        //   }, 500);
        //
        //   // When user click stop share source on chrome sharing bar
        //   backgroundAudioStream.addEventListener('inactive', this.handleBackgroundAudioStreamInactive);
        // } else {
        //   console.log('Cannot get background audio sound, please try again or contact to supporter!');
        // }
      };
    }
  }

  // useEffect(() => {
  //   if (!connection.connection) {
  //     return;
  //   }
  //   try {
  //     const ws = new WebSocket(connection.connection);
  //     ws.onopen = async () => {
  //       try {
  //         console.log('WebSocket connection opened');
  //         setWebSocket(ws);
  //         ws.send(
  //             JSON.stringify({
  //               common: { app_id: connection.appId },
  //               business: {
  //                 language: languageCode || 'vi_VN',
  //                 domain: 'iat',
  //                 accent: 'mandarin',
  //                 sample_rate: '16000',
  //                 vad_eos: timeoutSilent || VAD_EOS,
  //                 dwa: 'wpgs',
  //               },
  //               data: { status: 0, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
  //             })
  //         );
  //         AudioRecord.init(options);
  //         AudioRecord.start();
  //         await audioRecorderPlayer.setSubscriptionDuration(0.2);
  //         await audioRecorderPlayer.startRecorder(undefined, {}, true);
  //         audioRecorderPlayer.addRecordBackListener((e: any) => {
  //           // console.log(e.currentMetering);
  //           onMetering?.(e.currentMetering);
  //           setMetering(e.currentMetering);
  //         });
  //
  //         // Start processing audio chunks
  //         AudioRecord.on('data', (data) => {
  //           onData?.();
  //           ws.send(
  //               JSON.stringify({
  //                 data: {
  //                   status: 1,
  //                   format: 'audio/L16;rate=16000',
  //                   encoding: 'raw',
  //                   audio: data,
  //                 },
  //               })
  //           );
  //         });
  //         setConnectingWebSocket(false);
  //         setIsRecording(true);
  //       } catch (e) {
  //         console.log(e);
  //         setConnectingWebSocket(false);
  //       }
  //     };
  //     ws.onerror = (e: any) => {
  //       // an error occurred
  //       console.log(e.message);
  //       setIsRecording(false);
  //       setConnectingWebSocket(false);
  //     };
  //     ws.onmessage = async (e) => {
  //       // console.log(e.data);
  //       const data = JSON.parse(e.data);
  //       if (data?.code === 0 && data?.message === 'success') {
  //         setData((prevState: any) => [...prevState, data]);
  //       }
  //       if (data?.data?.status === 2) {
  //         try {
  //           if (data?.data?.result?.ws[0]?.cw?.[0]?.w === '') {
  //             onEndWithoutData?.();
  //           }
  //           await AudioRecord.stop();
  //           await audioRecorderPlayer.stopRecorder();
  //           audioRecorderPlayer.removeRecordBackListener();
  //           setIsRecording(false);
  //           setShouldSend(true);
  //           setMetering(0);
  //           setWebSocket(null);
  //           onEnd?.();
  //         } catch (error) {
  //           console.error('Error stopping recording:', error);
  //         }
  //       }
  //     };
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }, [connection]);

  const speakingText = useMemo(() => {
    if (data?.length) {
      // @ts-ignore
      return processData(formatData(data));
    }
    return '';
  }, [data]);


  return (
    <div className="App">
      <header className="App-header">
        {/*<input*/}
        {/*    type="file"*/}
        {/*    ref={fileRef}*/}
        {/*    onChange={playAudio}*/}
        {/*/>*/}
        <audio
            src="/voice-noise.wav"
            // autoPlay={true}
            controls={true}
            controlsList="nodownload"
        />
        {/*<AudioRecorder onFinish={({ id, audio }) => {*/}
        {/*  audioRecordRef.current.src = window.URL.createObjectURL(audio);*/}

        {/*}}/>*/}

        <p>speakingText</p>
        <p>{speakingText}</p>

        {/*{myStream && (*/}
        {/*    <>*/}
        {/*      <h1>My Stream</h1>*/}
        {/*      <ReactPlayer*/}
        {/*          playing*/}
        {/*          muted*/}
        {/*          height="100px"*/}
        {/*          width="200px"*/}
        {/*          url={myStream}*/}
        {/*      />*/}
        {/*    </>*/}
        {/*)}*/}

        {/*<audio ref={audioRecordRef} autoPlay={false} controls/>*/}
        {/*<button*/}
        {/*    onClick={downloadAudio}*/}
        {/*>download audio</button>*/}
        {
          texts.reverse().map((text, index) => (
              <p key={index}>
                {text}
              </p>
          ))
        }
        <button onClick={onClick} style={{
          padding: '10px 20px',
          backgroundColor: recording ? 'red' : 'blue',
        }}>
          {recording ? "Stop" : "Start"} Recording
        </button>
      </header>
    </div>
  );
}

export default App;

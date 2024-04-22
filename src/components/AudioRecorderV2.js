import React, { useEffect, useMemo, useRef, useState } from 'react';
import { assembleAuthUrl } from "../getUrl";
import { formatData, processData } from "../App";

function ArrayBufferToString(buffer) {
    return BinaryToString(String.fromCharCode.apply(null, Array.prototype.slice.apply(new Uint8Array(buffer))));
}

function StringToArrayBuffer(string) {
    return StringToUint8Array(string).buffer;
}

function BinaryToString(binary) {
    var error;

    try {
        return decodeURIComponent(escape(binary));
    } catch (_error) {
        error = _error;
        if (error instanceof URIError) {
            return binary;
        } else {
            throw error;
        }
    }
}

function StringToBinary(string) {
    var chars, code, i, isUCS2, len, _i;

    len = string.length;
    chars = [];
    isUCS2 = false;
    for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        code = String.prototype.charCodeAt.call(string, i);
        if (code > 255) {
            isUCS2 = true;
            chars = null;
            break;
        } else {
            chars.push(code);
        }
    }
    if (isUCS2 === true) {
        return unescape(encodeURIComponent(string));
    } else {
        return String.fromCharCode.apply(null, Array.prototype.slice.apply(chars));
    }
}

function StringToUint8Array(string) {
    var binary, binLen, buffer, chars, i, _i;
    binary = StringToBinary(string);
    binLen = binary.length;
    buffer = new ArrayBuffer(binLen);
    chars  = new Uint8Array(buffer);
    for (i = _i = 0; 0 <= binLen ? _i < binLen : _i > binLen; i = 0 <= binLen ? ++_i : --_i) {
        chars[i] = String.prototype.charCodeAt.call(binary, i);
    }
    return chars;
}

const AudioRecorderV2 = () => {
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
    const audioContextRef = useRef();
    const audioInputRef = useRef();
    const processorRef = useRef();

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
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                            deviceId: "default",
                            sampleRate: 16000,
                            sampleSize: 16,
                            channelCount: 1,
                        } });
                    setMyStream(stream);

                    audioContextRef.current = new window.AudioContext();

                    await audioContextRef.current.audioWorklet.addModule(
                        "/src/worklets/recorderWorkletProcessor.js"
                    );

                    audioContextRef.current.resume();

                    audioInputRef.current =
                        audioContextRef.current.createMediaStreamSource(stream);

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
                } catch (e) {
                    console.log(e);
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
                        // stopRecording();
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
    const speakingText = useMemo(() => {
        if (data?.length) {
            // @ts-ignore
            return processData(formatData(data));
        }
        return '';
    }, [data]);

    return (
    <div>
<p>speakingText</p>
<p>{speakingText}</p>
        <button
            onClick={onClick}
            className="bg-blue-200 rounded-lg p-2 border hover:border-blue-300"
        >
            {!recording ? "Start Record" : "Stop recording"}
        </button>

    </div>)
};

export default AudioRecorderV2;

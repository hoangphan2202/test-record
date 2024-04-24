import React from 'react';
import audioBufferToWav from 'audiobuffer-to-wav';
const AudioRecorder = ({ onFinish }) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [stream, setStream] = React.useState(null);
    const [voiceRecorder, setVoiceRecorder] =
        React.useState(null);

    const [content, setContent] = React.useState(null);

    const onAudioClick = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    sampleSize: 16,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            const mediaRecorder = new MediaRecorder(audioStream);
            setVoiceRecorder(mediaRecorder);
            setStream(audioStream);
            setIsRecording(true);
        } catch (e) {
            console.log(e);
            console.log("User didn't allowed us to access the microphone.");
        }
    };

    const onStopRecording = () => {
        if (!isRecording || !stream || !voiceRecorder) return;

        const tracks = stream.getAudioTracks();

        for (const track of tracks) {
            track.stop();
        }

        voiceRecorder.stop();

        setVoiceRecorder(null);
        setIsRecording(false);
    };

    /**
     * This hook is triggered when we start the recording
     */
    React.useEffect(() => {
        if (!isRecording || !voiceRecorder) return;

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
                    console.log(wavBlob);
                    const elm = document.getElementById('audio-recorder');
                    elm.src = URL.createObjectURL(wavBlob);
                    setContent(wavBlob)
                });
            };
        };
    }, [isRecording, voiceRecorder]);

    /**
     * This hook will call our callback after finishing the record
     */
    // React.useEffect(() => {
    //     if (isRecording || !content || !stream) return;
    //
    //     // onFinish({ id: stream.id, audio: content });
    // const elm = document.getElementById('audio-recorder');
    //     elm.src = URL.createObjectURL(content);
    //     setStream(null);
    //     setContent(null);
    // }, [isRecording, content]);

    return   <button
        id="audio-btn"
        onClick={!isRecording ? onAudioClick : onStopRecording}
        className="bg-blue-200 rounded-lg p-2 border hover:border-blue-300 "
        style={{
            display: 'none',
        }}
    >
        {!isRecording ? "Start Record" : "Stop recording"}
    </button>
};

export default AudioRecorder;

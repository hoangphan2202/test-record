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
                audio: true,
            });

            const mediaRecorder = new MediaRecorder(audioStream);
            setVoiceRecorder(mediaRecorder);
            setStream(audioStream);
            setIsRecording(true);
        } catch (e) {
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
                    setContent(wavBlob)
                });
            };
        };
    }, [isRecording, voiceRecorder]);

    /**
     * This hook will call our callback after finishing the record
     */
    React.useEffect(() => {
        if (isRecording || !content || !stream) return;

        onFinish({ id: stream.id, audio: content });

        setStream(null);
        setContent(null);
    }, [isRecording, content]);

    return   <button
        onClick={!isRecording ? onAudioClick : onStopRecording}
        className="bg-blue-200 rounded-lg p-2 border hover:border-blue-300"
    >
        {!isRecording ? "Start Record" : "Stop recording"}
    </button>
};

export default AudioRecorder;

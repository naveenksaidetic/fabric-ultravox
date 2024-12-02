import Layout from './components/layout';
import { useState, useCallback, useEffect, useRef } from 'react';
import { startCall, endCall, toggleMute } from './services/api';
import { CallConfig, SelectedTool } from './types/types';
import demoConfig from './services/demo-config';
import {
  Role,
  Transcript,
  UltravoxExperimentalMessageEvent,
  UltravoxSessionStatus,
} from 'ultravox-client';

const modelOptions = [
  { value: 'fixie-ai/ultravox', label: 'UV Llama 3.1 70B' },
  { value: 'fixie-ai/ultravox-8B', label: 'UV Llama 3.1 8b' },
  { value: 'fixie-ai/ultravox-mistral-nemo-12B', label: 'UV Mistral NeMo' },
];

const App = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('off');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>(
    []
  );
  const [customerProfileKey, setCustomerProfileKey] = useState<string | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const [showMuteSpeakerButton, setShowMuteSpeakerButton] = useState<boolean>(true);
  const [modelOverride, setModelOverride] = useState<string | undefined>(undefined);
  const [showDebugMessages, setShowDebugMessages] = useState<boolean>(false);
  const [showUserTranscripts, setShowUserTranscripts] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(false);
  const options = [
    { value: 'Mark', label: 'Mark' },
    { value: 'Martin-Chinese', label: 'Martin (Chinese)' },
    { value: 'Anas-Arabic', label: 'Anas (Arabic)' },
  ];

  const handleVoiceChange = (event: any) => {
    console.log('Selected value:', event.target.value);
    setSelectedVoice(event.target.value);
  };

  const handleModelChange = (event: any) => {
    console.log('Selected value:', event.target.value);
    setModelOverride(event.target.value);
  };

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript]);

  const toggleMic = useCallback(async () => {
    try {
      toggleMute(Role.USER);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  }, [isMuted]);

  const handleStatusChange = useCallback((status: UltravoxSessionStatus | string | undefined) => {
    if (status) {
      setAgentStatus(status);
    } else {
      setAgentStatus('off');
    }
  }, []);

  const handleTranscriptChange = useCallback((transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      setCallTranscript([...transcripts]);
    }
  }, []);

  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages((prevMessages) => [...prevMessages, debugMessage]);
  }, []);

  const clearCustomerProfile = useCallback(() => {
    // This will trigger a re-render of CustomerProfileForm with a new empty profile
    setCustomerProfileKey((prev) => (prev ? `${prev}-cleared` : 'cleared'));
  }, []);

  const handleStartCallButtonClick = async (
    modelOverride?: string,
    showDebugMessages?: boolean
  ) => {
    try {
      handleStatusChange('Starting call...');
      setCallTranscript(null);
      setCallDebugMessages([]);
      clearCustomerProfile();

      // Generate a new key for the customer profile
      const newKey = `call-${Date.now()}`;
      setCustomerProfileKey(newKey);

      // Setup our call config including the call key as a parameter restriction
      let callConfig: CallConfig = {
        systemPrompt: demoConfig.callConfig.systemPrompt,
        model: modelOverride || demoConfig.callConfig.model,
        languageHint: demoConfig.callConfig.languageHint,
        voice: selectedVoice || demoConfig.callConfig.voice,
        temperature: demoConfig.callConfig.temperature,
        maxDuration: demoConfig.callConfig.maxDuration,
        timeExceededMessage: demoConfig.callConfig.timeExceededMessage,
      };

      const paramOverride: { [key: string]: any } = {
        callId: newKey,
      };

      let cpTool: SelectedTool | undefined = demoConfig?.callConfig?.selectedTools?.find(
        (tool) => tool.toolName === 'createProfile'
      );

      if (cpTool) {
        cpTool.parameterOverrides = paramOverride;
      }
      callConfig.selectedTools = demoConfig.callConfig.selectedTools;

      await startCall(
        {
          onStatusChange: handleStatusChange,
          onTranscriptChange: handleTranscriptChange,
          onDebugMessage: handleDebugMessage,
        },
        callConfig,
        showDebugMessages
      );

      setIsCallActive(true);
      handleStatusChange('Call started successfully');
    } catch (error) {
      handleStatusChange(
        `Error starting call: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleEndCallButtonClick = async () => {
    try {
      handleStatusChange('Ending call...');
      await endCall();
      setIsCallActive(false);

      clearCustomerProfile();
      setCustomerProfileKey(null);
      handleStatusChange('Call ended successfully');
    } catch (error) {
      handleStatusChange(
        `Error ending call: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  return (
    <Layout>
      <div className="flex-1 h-[calc(100vh-150px)] grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-1 md:col-span-3 space-y-4">
          <div className="bg-Batman-Black rounded-md border border-greyyy p-4">
            <h2 className="font-bold mb-4">Config</h2>
            <div className="space-y-4">
              <div className="flex space-x-2 md:block md:space-x-0 md:space-y-4">
                <div className="w-1/2 md:w-auto">
                  <label className="text-xs text-gray-500">MODEL</label>
                  <select
                    className="w-full bg-black border border-gray-800 rounded p-2"
                    onChange={handleModelChange}
                  >
                    {modelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2 md:w-auto">
                  <label className="text-xs text-gray-500">VOICE</label>
                  <select
                    className="w-full bg-black border border-gray-800 rounded p-2"
                    onChange={handleVoiceChange}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!isCallActive ? (
                <button
                  className="w-full bg-Off-White py-3 rounded-full border border-white hover:bg-gray-200 bg-white text-black"
                  onClick={() => handleStartCallButtonClick(modelOverride, showDebugMessages)}
                >
                  Start
                </button>
              ) : (
                <button
                  className="w-full bg-Deep-Red py-3 rounded-full hover:bg-red-600 flex justify-center"
                  type="button"
                  onClick={handleEndCallButtonClick}
                  disabled={!isCallActive}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-phone-off brightness-0 invert"
                  >
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                    <line x1="22" x2="2" y1="2" y2="22"></line>
                  </svg>
                  <span className="ml-2">End Call</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-1 md:col-span-9 bg-Batman-Black rounded-md border border-greyyy flex flex-col h-[500px] md:h-full overflow-y-auto">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            {!isCallActive ? (
              <>
                <div className="h-10 flex items-center font-bold">Fabric AI Assistant Demo</div>
                <div className="flex items-center space-x-2">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="uppercase font-mono text-sm">off</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {!isMuted ? (
                  <button
                    className=" flex items-center justify-center border border-Grey rounded-full px-4 py-2 hover:bg-gray-700"
                    onClick={() => toggleMic()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-mic brightness-0 invert"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" x2="12" y1="19" y2="22"></line>
                    </svg>
                    <span className="ml-2">Mute</span>
                  </button>
                ) : (
                  <button
                    onClick={() => toggleMic()}
                    className=" flex items-center justify-center border border-Grey rounded-full px-4 py-2 hover:bg-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-mic-off brightness-0 invert"
                    >
                      <line x1="2" x2="22" y1="2" y2="22"></line>
                      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path>
                      <path d="M5 10v2a7 7 0 0 0 12 5"></path>
                      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>
                      <line x1="12" x2="12" y1="19" y2="22"></line>
                    </svg>
                    <span className="ml-2">Unmute</span>
                  </button>
                )}
                <div className="flex items-center space-x-2">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="uppercase font-mono text-sm">{agentStatus}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          {isCallActive ? (
            <div ref={transcriptContainerRef} className="flex-1 p-4 overflow-y-auto">
              {callTranscript &&
                callTranscript.map((transcript, index) => (
                  <div key={index}>
                    {showUserTranscripts ? (
                      <>
                        <p>
                          <span className="text-gray-600">
                            {transcript.speaker === 'agent' ? 'Ultravox' : 'User'}
                          </span>
                        </p>
                        <p className="mb-4">
                          <span>{transcript.text}</span>
                        </p>
                      </>
                    ) : (
                      transcript.speaker === 'agent' && (
                        <>
                          <p>
                            <span className="text-gray-600">
                              {transcript.speaker === 'agent' ? 'Ultravox' : 'User'}
                            </span>
                          </p>
                          <p className="mb-4">
                            <span>{transcript.text}</span>
                          </p>
                        </>
                      )
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 mb-6 mt-32 lg:mt-0">
                    This agent has been prompted to facilitate orders at a fictional drive-thru
                    called Dr. Donut.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default App;

import {
  UltravoxSession,
  UltravoxSessionStatus,
  Transcript,
  UltravoxExperimentalMessageEvent,
  Role,
} from 'ultravox-client';
import { JoinUrlResponse, CallConfig } from '../types/types';

let uvSession: UltravoxSession | null = null;
const debugMessages: Set<string> = new Set(['debug']);
const { VITE_ULTRAVOX_API_KEY } = import.meta.env;

interface CallCallbacks {
  onStatusChange: (status: UltravoxSessionStatus | string | undefined) => void;
  onTranscriptChange: (transcripts: Transcript[] | undefined) => void;
  onDebugMessage?: (message: UltravoxExperimentalMessageEvent) => void;
}

export function toggleMute(role: Role): void {
  if (uvSession) {
    // Toggle (user) Mic
    if (role == Role.USER) {
      uvSession.isMicMuted ? uvSession.unmuteMic() : uvSession.muteMic();
    }
    // Mute (agent) Speaker
    else {
      uvSession.isSpeakerMuted ? uvSession.unmuteSpeaker() : uvSession.muteSpeaker();
    }
  } else {
    console.error('uvSession is not initialized.');
  }
}

async function createCall(
  callConfig: CallConfig,
  showDebugMessages?: boolean
): Promise<JoinUrlResponse> {
  try {
    if (showDebugMessages) {
      console.log(`Using model ${callConfig.model}`);
    }

    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Unsafe-API-Key': `${VITE_ULTRAVOX_API_KEY}`,
      },
      body: JSON.stringify({ ...callConfig }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    const data: JoinUrlResponse = await response.json();

    if (showDebugMessages) {
      console.log(`Call created. Join URL: ${data.joinUrl}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
}

export async function startCall(
  callbacks: CallCallbacks,
  callConfig: CallConfig,
  showDebugMessages?: boolean
): Promise<void> {
  const callData = await createCall(callConfig, showDebugMessages);
  const joinUrl = callData.joinUrl;

  if (!joinUrl && !uvSession) {
    console.error('Join URL is required');
    return;
  } else {
    console.log('Joining call:', joinUrl);

    // Start up our Ultravox Session
    uvSession = new UltravoxSession({ experimentalMessages: debugMessages });

    if (showDebugMessages) {
      console.log('uvSession created:', uvSession);
      console.log(
        'uvSession methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(uvSession))
      );
    }

    if (uvSession) {
      uvSession.addEventListener('status', (event: any) => {
        callbacks.onStatusChange(uvSession?.status);
      });

      uvSession.addEventListener('transcripts', (event: any) => {
        callbacks.onTranscriptChange(uvSession?.transcripts);
      });

      uvSession.addEventListener('experimental_message', (msg: any) => {
        callbacks?.onDebugMessage?.(msg);
      });

      uvSession.joinCall(joinUrl);
      console.log('Session status:', uvSession.status);
    } else {
      return;
    }
  }

  console.log('Call started!');
}

export async function endCall(): Promise<void> {
  console.log('Call ended.');

  if (uvSession) {
    uvSession.leaveCall();
    uvSession = null;
  }
}

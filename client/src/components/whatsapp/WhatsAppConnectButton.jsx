import { useEffect, useRef, useState } from 'react';
import { whatsappApi } from '../../api/whatsappApi';

const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

function ensureFacebookSdk({ appId, version }) {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }

    const existingScript = document.getElementById('facebook-jssdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.FB));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK')));
      return;
    }

    window.fbAsyncInit = function fbAsyncInit() {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version,
      });
      resolve(window.FB);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = FACEBOOK_SDK_SRC;
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.body.appendChild(script);
  });
}

export default function WhatsAppConnectButton({ onConnected, onError, onCancel }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const signupRef = useRef({ code: '', wabaId: '', phoneNumberId: '', businessId: '' });
  const submittedRef = useRef(false);

  const appId = import.meta.env.VITE_META_APP_ID;
  const configId = import.meta.env.VITE_META_CONFIG_ID;
  const sdkVersion = import.meta.env.VITE_META_GRAPH_API_VERSION || 'v23.0';

  useEffect(() => {
    let active = true;

    if (!appId) return undefined;

    ensureFacebookSdk({ appId, version: sdkVersion })
      .then(() => {
        if (active) setSdkReady(true);
      })
      .catch((error) => {
        if (active) onError?.(error.message);
      });

    return () => {
      active = false;
    };
  }, [appId, onError, sdkVersion]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (!event.origin || (!event.origin.includes('facebook.com') && !event.origin.includes('fb.com'))) {
        return;
      }

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (error) {
          return;
        }
      }

      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (payload.event === 'FINISH' || payload.event === 'FINISH_ONLY_WABA') {
        signupRef.current = {
          ...signupRef.current,
          wabaId: payload.data?.waba_id || '',
          phoneNumberId: payload.data?.phone_number_id || '',
          businessId: payload.data?.business_id || '',
        };

        await submitIfReady();
        return;
      }

      if (payload.event === 'ERROR') {
        setIsBusy(false);
        onError?.(payload.data?.error_message || 'Meta Embedded Signup failed');
        return;
      }

      setIsBusy(false);
      onCancel?.(payload.data?.current_step || 'signup_cancelled');
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCancel, onError, onConnected]);

  const submitIfReady = async () => {
    const { code, wabaId, phoneNumberId, businessId } = signupRef.current;
    if (!code || !wabaId || !phoneNumberId || submittedRef.current) return;

    submittedRef.current = true;

    try {
      const response = await whatsappApi.connect({
        code,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        business_id: businessId,
      });

      onConnected?.(response.data);
    } catch (error) {
      submittedRef.current = false;
      onError?.(error.response?.data?.message || error.message || 'Could not complete WhatsApp connection');
    } finally {
      setIsBusy(false);
    }
  };

  const handleClick = async () => {
    if (!sdkReady || !configId) {
      onError?.('Meta SDK is not ready yet');
      return;
    }

    setIsBusy(true);
    submittedRef.current = false;
    signupRef.current = { code: '', wabaId: '', phoneNumberId: '', businessId: '' };

    try {
      const FB = await ensureFacebookSdk({ appId, version: sdkVersion });

      FB.login(
        async (response) => {
          if (!response?.authResponse?.code) {
            setIsBusy(false);
            onCancel?.('popup_closed');
            return;
          }

          signupRef.current = {
            ...signupRef.current,
            code: response.authResponse.code,
          };

          await submitIfReady();
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            feature: 'whatsapp_embedded_signup',
            sessionInfoVersion: 3,
          },
        }
      );
    } catch (error) {
      setIsBusy(false);
      onError?.(error.message || 'Could not open Meta Embedded Signup');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy || !sdkReady || !appId || !configId}
      className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isBusy ? 'Connecting...' : 'Connect WhatsApp'}
    </button>
  );
}

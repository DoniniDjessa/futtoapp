import { useMemo } from 'react'
import { Platform, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { Text, YStack, Button, XStack } from 'tamagui'
import { Navigation } from 'lucide-react-native'
import { fonts } from '@/lib/fonts'
import { useUserLocation } from '@/lib/location'

type Props = {
  lat: number
  lng: number
  onChange: (coords: { lat: number; lng: number }) => void
  height?: number
  dark?: boolean
}

/** Carte OSM — curseur déplaçable + bouton ma position. */
export function PinMapPicker({ lat, lng, onChange, height = 220, dark = true }: Props) {
  const { request, granted } = useUserLocation()

  const html = useMemo(
    () => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;width:100%;margin:0;background:#dfece3}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function boot(){
    if (!window.L) return;
    var map = L.map('map',{zoomControl:true}).setView([${lat},${lng}],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    var marker = L.marker([${lat},${lng}],{draggable:true}).addTo(map);
    function post(ll){
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({lat:ll.lat,lng:ll.lng}));
    }
    marker.on('dragend', function(e){ post(e.target.getLatLng()); });
    map.on('click', function(e){ marker.setLatLng(e.latlng); post(e.latlng); });
    setTimeout(function(){ map.invalidateSize(); }, 120);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
</script>
</body></html>`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(lat * 200) / 200, Math.round(lng * 200) / 200],
  )

  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <Text color={dark ? '#9ca3af' : '#6b7280'} fontSize={12} style={{ ...fonts.regular }}>
          Déplace le pin ou tape la carte
        </Text>
        <Button
          size="$2"
          backgroundColor="#00b14f"
          color="#fff"
          borderRadius={999}
          icon={<Navigation size={14} color="#fff" />}
          onPress={() => void request()}
        >
          {granted ? 'Recentrer' : 'Ma position'}
        </Button>
      </XStack>
      <View
        style={{
          height,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: dark ? '#2a2a2a' : '#e5e7eb',
        }}
      >
        <WebView
          key={`${Math.round(lat * 100)}-${Math.round(lng * 100)}`}
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://unpkg.com/' }}
          style={{ width: '100%', height, backgroundColor: '#dfece3' }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data) as { lat: number; lng: number }
              if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
                onChange({ lat: data.lat, lng: data.lng })
              }
            } catch {
              /* ignore */
            }
          }}
        />
      </View>
      <Text
        color={dark ? '#9ca3af' : '#6b7280'}
        fontSize={11}
        style={{ ...fonts.medium }}
      >
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </Text>
    </YStack>
  )
}

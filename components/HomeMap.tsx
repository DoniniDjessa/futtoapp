import { useEffect, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRouter } from 'expo-router'
import { Navigation, Plus } from 'lucide-react-native'
import { Text, YStack, Button } from 'tamagui'
import { TerrainDetailSheet } from '@/components/TerrainDetailSheet'
import { fonts } from '@/lib/fonts'
import {
  useUserLocation,
  isTerrainNearby,
  getTerrainDistanceKm,
  PROXIMITY_RADIUS_KM,
} from '@/lib/location'
import { useThemeMode } from '@/lib/theme-mode'
import { colors, lightColors } from '@/lib/theme'
import type { Terrain } from '@/lib/types'

type MapTerrain = Pick<
  Terrain,
  'id' | 'name' | 'lat' | 'lng' | 'quartier' | 'zone' | 'image_url' | 'price_per_hour' | 'surface' | 'rating'
>

type Props = {
  height?: number
  terrains?: MapTerrain[]
  fullscreen?: boolean
  onMapGesture?: (active: boolean) => void
  showExpand?: boolean
}

/**
 * Carte Leaflet / OSM (tuiles inchangées).
 * Couleurs UI overlays + modal terrain au tap marqueur.
 */
export function HomeMap({
  height = 220,
  terrains = [],
  fullscreen = false,
  onMapGesture,
  showExpand = true,
}: Props) {
  const router = useRouter()
  const { mode } = useThemeMode()
  const palette = mode === 'dark' ? colors : lightColors
  const { coords, granted, loading, error, request } = useUserLocation()
  const [mapReady, setMapReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const withCoords = terrains.filter((t) => t.lat != null && t.lng != null)
  const selected = selectedId ? terrains.find((t) => t.id === selectedId) ?? null : null

  // Terrains dans un rayon de 2.5 km (diamètre d'environ 5 km)
  const nearbyTerrains = useMemo(() => {
    return withCoords.filter((t) => isTerrainNearby(t, coords, PROXIMITY_RADIUS_KM))
  }, [withCoords, coords])

  const nearbyLabel = loading
    ? 'Localisation…'
    : nearbyTerrains.length === 0
      ? 'Aucun terrain à proximité'
      : nearbyTerrains.length === 1
        ? '1 terrain à proximité'
        : `${nearbyTerrains.length} terrains à proximité`

  const html = useMemo(() => {
    const markers = withCoords
      .map((t) => {
        const id = JSON.stringify(t.id)
        const title = JSON.stringify(t.name)
        const dist = getTerrainDistanceKm(t, coords)
        const distLabel = dist != null && dist < 999 ? ` · ${dist} km` : ''
        const desc = JSON.stringify(
          ([t.quartier, t.zone].filter(Boolean).join(' · ') || '') + distLabel,
        )
        return `L.marker([${Number(t.lat)},${Number(t.lng)}],{icon:terrainIcon,riseOnHover:true})
          .addTo(map)
          .bindPopup('<b>'+${title}+'</b><br/>'+${desc})
          .on('click', function(){
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'terrain',id:${id}}));
          });`
      })
      .join('\n')

    const zoom = fullscreen ? 14 : 13

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;width:100%;margin:0;background:#dfece3;touch-action:pan-x pan-y;}
  .leaflet-control-attribution{font-size:9px;max-width:65%;opacity:.75}
  .futto-pin{
    width:30px;height:30px;margin-left:-15px;margin-top:-30px;
    background:#00b14f;border:3px solid #fff;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 10px rgba(0,0,0,.4);
  }
  .futto-pin-dot{
    width:8px;height:8px;background:#fff;border-radius:50%;
    position:absolute;top:8px;left:8px;
  }
  .futto-user{
    width:18px;height:18px;margin-left:-9px;margin-top:-9px;
    background:#ff7a00;border:3px solid #fff;border-radius:50%;
    box-shadow:0 0 0 4px rgba(255,122,0,.4),0 2px 6px rgba(0,0,0,.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function boot(){
    try {
      if (!window.L) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}));
        return;
      }
      var map = L.map('map',{
        zoomControl:${fullscreen ? 'true' : 'false'},
        attributionControl:true,
        dragging:true,
        scrollWheelZoom:true,
        touchZoom:true,
        doubleClickZoom:true,
        boxZoom:false
      }).setView([${coords.lat},${coords.lng}],${zoom});
            var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        subdomains:['a','b','c'],
        attribution:'&copy; OpenStreetMap'
      }).addTo(map);
      tileLayer.on('tileerror', function(error, tile) {
        if (!tile._hasFallback && error && error.coords) {
          tile._hasFallback = true;
          tile.tile.src = 'https://basemaps.cartocdn.com/rastertiles/voyager/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
        }
      });
      var terrainIcon = L.divIcon({
        className:'',
        html:'<div class="futto-pin"><div class="futto-pin-dot"></div></div>',
        iconSize:[30,30],
        iconAnchor:[15,30],
        popupAnchor:[0,-30]
      });
      var userIcon = L.divIcon({
        className:'',
        html:'<div class="futto-user"></div>',
        iconSize:[18,18],
        iconAnchor:[9,9]
      });
      L.circle([${coords.lat},${coords.lng}],{
        radius:2500,color:'#00b14f',weight:1.5,fillColor:'#00b14f',fillOpacity:0.08
      }).addTo(map);
      L.marker([${coords.lat},${coords.lng}],{icon:userIcon,zIndexOffset:500})
        .addTo(map).bindPopup('Ta position');
      ${markers}
      function ping(){ map.invalidateSize(); }
      setTimeout(ping, 100);
      setTimeout(ping, 400);
      map.on('dragstart zoomstart', function(){
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'gesture',active:true}));
      });
      map.on('dragend zoomend', function(){
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'gesture',active:false}));
      });
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    } catch (e) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}));
    }
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
</script>
</body>
</html>`
  }, [coords.lat, coords.lng, withCoords, fullscreen])

  const mapHeight = fullscreen ? undefined : height

  useEffect(() => {
    return () => onMapGesture?.(false)
  }, [onMapGesture])

  function onWebMessage(raw: string) {
    try {
      const msg = JSON.parse(raw) as {
        type?: string
        active?: boolean
        id?: string
      }
      if (msg.type === 'ready') setMapReady(true)
      if (msg.type === 'gesture') onMapGesture?.(Boolean(msg.active))
      if (msg.type === 'terrain' && msg.id) setSelectedId(msg.id)
    } catch {
      /* ignore */
    }
  }

  const webView = (
    <WebView
      key={fullscreen ? 'futto-map-fullscreen' : 'futto-map-inline'}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://unpkg.com/' }}
      style={
        fullscreen
          ? StyleSheet.absoluteFillObject
          : { width: '100%', height: mapHeight, backgroundColor: '#dfece3' }
      }
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      androidLayerType={Platform.OS === 'android' ? 'software' : undefined}
      androidHardwareAccelerationDisabled={false}
      userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 FuttoApp/1.0"
      containerStyle={{ backgroundColor: '#dfece3' }}
      cacheEnabled
      onTouchStart={() => onMapGesture?.(true)}
      onTouchEnd={() => onMapGesture?.(false)}
      onMessage={(e) => onWebMessage(e.nativeEvent.data)}
    />
  )

  /** Look UI (pas la carte) — chip terrains à proximité */
  const chip = (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: '#009643',
        borderWidth: 0,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexShrink: 1,
      }}
    >
      <Text color="#fff" fontSize={fullscreen ? 13 : 12} style={{ ...fonts.semibold }}>
        {nearbyLabel}
      </Text>
    </View>
  )

  const terrainModal = (
    <Modal
      visible={!!selected}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedId(null)}
    >
      {selected ? (
        <TerrainDetailSheet
          terrain={selected as Terrain}
          palette={palette}
          mode="modal"
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </Modal>
  )

  if (fullscreen) {
    return (
      <View style={{ flex: 1, backgroundColor: '#dfece3' }}>
        {webView}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 36 : 24,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {chip}
          <Button
            size="$3"
            backgroundColor={colors.accent}
            color="#fff"
            borderRadius={999}
            icon={<Navigation size={16} color="#fff" />}
            onPress={() => void request()}
          >
            Ma position
          </Button>
        </View>
        {terrainModal}
      </View>
    )
  }

  return (
    <YStack
      height={height}
      width="100%"
      borderRadius={16}
      borderWidth={1}
      borderColor={palette.border}
      overflow="hidden"
      position="relative"
      backgroundColor="#dfece3"
    >
      {webView}

      {!mapReady ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center', backgroundColor: '#dfece3' },
          ]}
        >
          <Text color="#374151" fontSize={13} style={{ ...fonts.medium }}>
            Chargement de la carte…
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {chip}
        {!granted ? (
          <Button
            size="$2"
            backgroundColor={colors.accent}
            color="#fff"
            borderRadius={999}
            icon={<Navigation size={14} color="#fff" />}
            onPress={() => void request()}
          >
            Ma position
          </Button>
        ) : null}
      </View>

      {showExpand ? (
        <Pressable
          onPress={() => router.push('/map-fullscreen')}
          accessibilityLabel="Agrandir la carte"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {error && !granted ? (
        <View style={{ position: 'absolute', top: 10, left: 12, right: 56 }} pointerEvents="none">
          <Text color={palette.textMuted} fontSize={11} style={{ ...fonts.regular }}>
            {error}
          </Text>
        </View>
      ) : null}

      {terrainModal}
    </YStack>
  )
}

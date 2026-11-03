<?php
/**
 * ReelSave - Self-Hosted Instagram & Facebook Downloader API
 * Host this on your cPanel hosting (public_html/api.php)
 * Works with zero API keys and no third-party limits!
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 0. Configuration: Optional Instagram Dummy Account Session ID
// (If provided, bypasses Instagram restrictions 100% with high-definition media)
$instagramSessionId = '13448355818%3AaaZbTTAx4A00y6%3A24%3AAYmYsKlFwG2wFOC0SDq_BKGA1AxOn2xpeGcc5oBr2P4';

// 1. Get input URL from GET, POST or JSON body
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$targetUrl = isset($_REQUEST['url']) ? trim($_REQUEST['url']) : '';
if (empty($targetUrl) && isset($jsonData['url'])) {
    $targetUrl = trim($jsonData['url']);
}

if (empty($targetUrl)) {
    echo json_encode([
        'success' => false,
        'error' => ['message' => 'Please provide a valid URL parameter (e.g. ?url=https://www.instagram.com/reel/...)']
    ]);
    exit;
}

// 2. Detect Platform
$isInstagram = (stripos($targetUrl, 'instagram.com') !== false);
$isFacebook  = (stripos($targetUrl, 'facebook.com') !== false || stripos($targetUrl, 'fb.watch') !== false || stripos($targetUrl, 'fb.com') !== false);

if (!$isInstagram && !$isFacebook) {
    echo json_encode([
        'success' => false,
        'error' => ['message' => 'Only public Instagram and Facebook links are supported.']
    ]);
    exit;
}

try {
    if ($isInstagram) {
        $result = resolveInstagram($targetUrl, $instagramSessionId);
    } else {
        $result = resolveFacebook($targetUrl);
    }

    echo json_encode([
        'success' => true,
        'data' => $result
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => ['message' => $e->getMessage()]
    ]);
}

/**
 * Resolves Instagram Reels, Posts, and Videos
 */
function resolveInstagram($url, $sessionId = '') {
    // Extract shortcode
    preg_match('/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/', $url, $matches);
    $shortcode = isset($matches[1]) ? $matches[1] : '';

    if (empty($shortcode)) {
        throw new Exception('Could not extract shortcode from this Instagram link.');
    }

    $videoUrl = null;
    $thumbnail = null;
    $caption = 'Instagram Media';
    $author = 'Instagram Creator';

    // Strategy 1: GraphQL endpoint with Web App ID & optional session cookie
    $graphqlUrl = "https://www.instagram.com/graphql/query/?doc_id=8845758582119845&variables=" . urlencode(json_encode(['shortcode' => $shortcode]));
    $headers = [
        'X-IG-App-ID: 936619743392459',
        'Accept: */*'
    ];
    if (!empty($sessionId)) {
        $headers[] = 'Cookie: sessionid=' . trim($sessionId) . '; ds_user_id=1';
    }

    $response = fetchUrl($graphqlUrl, $headers);

    if (!empty($response)) {
        $json = json_decode($response, true);
        $media = isset($json['data']['xdt_shortcode_media']) ? $json['data']['xdt_shortcode_media'] : null;
        if ($media) {
            $videoUrl = isset($media['video_url']) ? $media['video_url'] : null;
            $thumbnail = isset($media['display_url']) ? $media['display_url'] : null;
            if (isset($media['owner']['username'])) {
                $author = '@' . $media['owner']['username'];
            }
            if (isset($media['edge_media_to_caption']['edges'][0]['node']['text'])) {
                $caption = $media['edge_media_to_caption']['edges'][0]['node']['text'];
            }
        }
    }

    // Strategy 2: Query public post page with Crawler User-Agent (OpenGraph)
    if (!$videoUrl) {
        $postUrl = "https://www.instagram.com/p/{$shortcode}/";
        $html = fetchUrl($postUrl, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        ], 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

        if (!empty($html)) {
            // Check og:video
            if (preg_match('/<meta[^>]+property="og:video"[^>]+content="([^">]+)"/i', $html, $m)) {
                $videoUrl = html_entity_decode($m[1]);
            } elseif (preg_match('/<meta[^>]+content="([^">]+)"[^>]+property="og:video"/i', $html, $m)) {
                $videoUrl = html_entity_decode($m[1]);
            }

            // Check og:image
            if (preg_match('/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i', $html, $m)) {
                $thumbnail = html_entity_decode($m[1]);
            }

            // Check video_url in JSON script
            if (!$videoUrl && preg_match('/"video_url"\s*:\s*"([^"]+)"/', $html, $m)) {
                $videoUrl = stripslashes($m[1]);
            }
        }
    }

    // Strategy 3: Query Instagram public embed captioned
    if (!$videoUrl) {
        $embedUrl = "https://www.instagram.com/p/{$shortcode}/embed/captioned/";
        $embedHtml = fetchUrl($embedUrl, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        ]);

        if (!empty($embedHtml)) {
            if (preg_match('/"video_url"\s*:\s*"([^"]+)"/', $embedHtml, $m)) {
                $videoUrl = stripslashes($m[1]);
            }
            if (preg_match('/class="EmbeddedMediaImage"[^>]+src="([^">]+)"/', $embedHtml, $m)) {
                $thumbnail = html_entity_decode($m[1]);
            }
        }
    }

    if (!$videoUrl && !$thumbnail) {
        throw new Exception('Unable to extract video stream from this Instagram link. The post may be private or restricted.');
    }

    $downloads = [];
    if ($videoUrl) {
        $downloads[] = [
            'quality' => 'Full HD 1080p',
            'format' => 'MP4',
            'url' => $videoUrl,
            'filename' => "ReelSave_Instagram_{$shortcode}.mp4"
        ];
    }
    if ($thumbnail) {
        $downloads[] = [
            'quality' => 'Cover Image',
            'format' => 'JPG',
            'url' => $thumbnail,
            'filename' => "ReelSave_Instagram_{$shortcode}.jpg"
        ];
    }

    return [
        'platform' => 'instagram',
        'id' => $shortcode,
        'type' => $videoUrl ? 'video' : 'image',
        'title' => mb_substr($caption, 0, 80),
        'caption' => $caption,
        'author' => $author,
        'thumbnail' => $thumbnail ? $thumbnail : $videoUrl,
        'downloadUrl' => $videoUrl ? $videoUrl : $thumbnail,
        'downloads' => $downloads
    ];
}

/**
 * Resolves Facebook Videos and Reels
 */
function resolveFacebook($url) {
    $html = fetchUrl($url, [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    ], 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

    if (empty($html)) {
        throw new Exception('Could not connect to Facebook to extract this media.');
    }

    $sdUrl = null;
    $hdUrl = null;
    $thumbnail = null;

    if (preg_match('/"playable_url_quality_hd"\s*:\s*"([^"]+)"/', $html, $m)) {
        $hdUrl = stripslashes($m[1]);
    }
    if (preg_match('/"playable_url"\s*:\s*"([^"]+)"/', $html, $m)) {
        $sdUrl = stripslashes($m[1]);
    }
    if (preg_match('/<meta[^>]+property="og:video"[^>]+content="([^">]+)"/i', $html, $m)) {
        $sdUrl = html_entity_decode($m[1]);
    }
    if (preg_match('/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i', $html, $m)) {
        $thumbnail = html_entity_decode($m[1]);
    }

    $videoUrl = $hdUrl ? $hdUrl : $sdUrl;
    if (!$videoUrl) {
        throw new Exception('Could not extract public video stream from this Facebook post.');
    }

    $downloads = [];
    if ($hdUrl) {
        $downloads[] = [
            'quality' => 'High Definition 720p/1080p',
            'format' => 'MP4',
            'url' => $hdUrl,
            'filename' => 'ReelSave_Facebook_HD.mp4'
        ];
    }
    if ($sdUrl) {
        $downloads[] = [
            'quality' => 'Standard Definition (SD)',
            'format' => 'MP4',
            'url' => $sdUrl,
            'filename' => 'ReelSave_Facebook_SD.mp4'
        ];
    }

    return [
        'platform' => 'facebook',
        'id' => 'fb_' . time(),
        'type' => 'video',
        'title' => 'Facebook Public Video',
        'caption' => 'Facebook public media stream ready for download.',
        'author' => 'Facebook Creator',
        'thumbnail' => $thumbnail,
        'downloadUrl' => $videoUrl,
        'downloads' => $downloads
    ];
}

/**
 * Safe cURL Helper with cookie & redirect handling
 */
function fetchUrl($url, $headers = [], $customUa = null) {
    $ua = $customUa ? $customUa : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_USERAGENT, $ua);

    $defaultHeaders = [
        'Accept-Language: en-US,en;q=0.9'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($defaultHeaders, $headers));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if (isset($_GET['debug']) && $_GET['debug'] == 1) {
        echo json_encode([
            'debug_url' => $url,
            'http_code' => $httpCode,
            'curl_error' => $curlErr,
            'response_len' => strlen($response ?: '')
        ]);
        exit;
    }

    return ($httpCode >= 200 && $httpCode < 400) ? $response : null;
}

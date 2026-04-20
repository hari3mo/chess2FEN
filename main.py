import numpy as np
import cv2
import os

LIGHT_COLOR_BGR = np.array([220, 235, 238])   # cream squares
DARK_COLOR_BGR  = np.array([100, 155, 115])   # green squares
COLOR_TOLERANCE = 25

def load_screenshot(path):
    img = cv2.imread(path)
    return img

def detect_board(screenshot, debug=False):
    light_mask = cv2.inRange(
        screenshot,
        LIGHT_COLOR_BGR - COLOR_TOLERANCE,
        LIGHT_COLOR_BGR + COLOR_TOLERANCE,
    )
    dark_mask = cv2.inRange(
        screenshot,
        DARK_COLOR_BGR - COLOR_TOLERANCE,
        DARK_COLOR_BGR + COLOR_TOLERANCE,
    )

    board_mask = cv2.bitwise_or(light_mask, dark_mask)

    if debug:
        debug_output(board_mask, 'board_mask_1.png')

    contours, _ = cv2.findContours(
        board_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    if len(contours) == 0:
        raise ValueError('Unable to detect board.')

    largest_contour = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_contour)

    if debug:
        cv2.rectangle(screenshot, (x, y), (x + w, y + h), (0, 0, 255), 3)
        debug_output(screenshot, 'detected_board_1.png')

    return (x, y, w, h)
    
def debug_output(image, filename):
    path = os.path.join('./debug', filename)
    if os.path.exists(path):
        current_version = os.path.splitext(filename)[0].split('_')[-1]
        new_version = str(int(current_version) + 1) 
        filename = filename.replace(current_version, new_version)
        path = os.path.join('./debug', filename)
    cv2.imwrite(path, image)

if __name__ == "__main__":
    screenshot = load_screenshot('./templates/board.png')
    board_region = detect_board(screenshot, debug=True)
    board = ...
    print("Detected board region (x, y, w, h):", board_region)

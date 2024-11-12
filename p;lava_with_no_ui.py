from argparse import ArgumentParser
import copy
from utils.easydict import EasyDict
from tasks.eval.model_utils import load_pllava
from tasks.eval.eval_utils import ChatPllava, conv_plain_v1, Conversation, conv_templates

SYSTEM = """You are a powerful Video Magic ChatBot, a large vision-language assistant. 
You are able to understand the video content that the user provides and assist the user in a video-language related task.
The user might provide you with the video and maybe some extra noisy information to help you out or ask you a question. Make use of the information in a proper way to be competent for the job.
### INSTRUCTIONS:
1. Follow the user's instruction.
2. Be critical yet believe in yourself.
"""

INIT_CONVERSATION: Conversation = conv_plain_v1.copy()

# Model Initialization
def init_model(args):
    print('Initializing PLLaVA')
    model, processor = load_pllava(
        args.pretrained_model_name_or_path, args.num_frames, 
        use_lora=args.use_lora, 
        weight_dir=args.weight_dir, 
        lora_alpha=args.lora_alpha, 
        use_multi_gpus=args.use_multi_gpus)
    if not args.use_multi_gpus:
        model = model.to('cuda')
    chat = ChatPllava(model, processor)
    return chat

def process_video_and_ask(chat, video_path, question, num_segments, num_beams, temperature):
    # 동영상 파일을 업로드하고 초기화
    chat_state = INIT_CONVERSATION.copy()
    img_list = []
    print(f"Processing video: {video_path}")

    # 동영상 업로드
    llm_message, img_list, chat_state = chat.upload_video(video_path, chat_state, img_list, num_segments)

    # 질의 수행
    chat_state = chat.ask(question, chat_state, SYSTEM)
    llm_message, _, chat_state = chat.answer(conv=chat_state, img_list=img_list, max_new_tokens=200, num_beams=num_beams, temperature=temperature)

    print(f"Answer: {llm_message}")

def parse_args():
    parser = ArgumentParser()
    parser.add_argument(
        "--pretrained_model_name_or_path",
        type=str,
        required=True,
        default='llava-hf/llava-1.5-7b-hf'
    )
    parser.add_argument(
        "--video_path",
        type=str,
        required=True,
        help="Path to the input video file"
    )
    parser.add_argument(
        "--question",
        type=str,
        required=True,
        help="Question about the video content"
    )
    parser.add_argument(
        "--num_frames",
        type=int,
        default=4,
        help="Number of frames to process from the video"
    )
    parser.add_argument(
        "--num_segments",
        type=int,
        default=8,
        help="Number of segments to divide the video into"
    )
    parser.add_argument(
        "--num_beams",
        type=int,
        default=1,
        help="Beam search number for generating response"
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=1.0,
        help="Temperature setting for response generation"
    )
    parser.add_argument(
        "--use_lora",
        action='store_true',
        help="Whether to use LoRA for model fine-tuning"
    )
    parser.add_argument(
        "--use_multi_gpus",
        action='store_true',
        help="Whether to use multiple GPUs"
    )
    parser.add_argument(
        "--weight_dir",
        type=str,
        default=None,
        help="Directory for model weights"
    )
    parser.add_argument(
        "--lora_alpha",
        type=int,
        default=None,
        help="Alpha setting for LoRA"
    )
    args = parser.parse_args()
    return args

if __name__ == "__main__":
    args = parse_args()

    # 모델 초기화
    chat = init_model(args)
    INIT_CONVERSATION = conv_templates[args.conv_mode] if args.conv_mode else conv_plain_v1.copy()

    # 동영상 처리 및 질의응답 수행
    process_video_and_ask(
        chat=chat,
        video_path=args.video_path,
        question=args.question,
        num_segments=args.num_segments,
        num_beams=args.num_beams,
        temperature=args.temperature
    )

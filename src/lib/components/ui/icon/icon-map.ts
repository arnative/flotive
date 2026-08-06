import HomeSmile from 'reicon-svelte/icons/HomeSmile.svelte';
import History from 'reicon-svelte/icons/History.svelte';
import Wallet from 'reicon-svelte/icons/Wallet.svelte';
import Receipt from 'reicon-svelte/icons/Receipt.svelte';
import ChartPie from 'reicon-svelte/icons/ChartPie.svelte';
import Banknote2 from 'reicon-svelte/icons/Banknote2.svelte';
import Category2 from 'reicon-svelte/icons/Category2.svelte';
import Trash3 from 'reicon-svelte/icons/Trash3.svelte';
import Sidebar2 from 'reicon-svelte/icons/Sidebar2.svelte';
import Sun from 'reicon-svelte/icons/Sun.svelte';
import Moon from 'reicon-svelte/icons/Moon.svelte';
import Monitor from 'reicon-svelte/icons/Monitor.svelte';
import Mobile from 'reicon-svelte/icons/Mobile.svelte';
import Gear from 'reicon-svelte/icons/Gear.svelte';
import Logout4 from 'reicon-svelte/icons/Logout4.svelte';
import Pen from 'reicon-svelte/icons/Pen.svelte';
import Trash4 from 'reicon-svelte/icons/Trash4.svelte';
import More from 'reicon-svelte/icons/More.svelte';
import MoreH from 'reicon-svelte/icons/MoreH.svelte';
import InfoSquare from 'reicon-svelte/icons/InfoSquare.svelte';
import Server from 'reicon-svelte/icons/Server.svelte';
import Upload3 from 'reicon-svelte/icons/Upload3.svelte';
import ForkKnife from 'reicon-svelte/icons/ForkKnife.svelte';
import BillList from 'reicon-svelte/icons/BillList.svelte';
import Health from 'reicon-svelte/icons/Health.svelte';
import MortarboardSquare from 'reicon-svelte/icons/MortarboardSquare.svelte';
import BagShopping from 'reicon-svelte/icons/BagShopping.svelte';
import TransferH from 'reicon-svelte/icons/TransferH.svelte';
import ArrowDottedRotateAnticlockwise from 'reicon-svelte/icons/ArrowDottedRotateAnticlockwise.svelte';
import TrendDown from 'reicon-svelte/icons/TrendDown.svelte';
import TrendUp from 'reicon-svelte/icons/TrendUp.svelte';
import Plus from 'reicon-svelte/icons/Plus.svelte';
import Check from 'reicon-svelte/icons/Check.svelte';
import X from 'reicon-svelte/icons/X.svelte';
import Star from 'reicon-svelte/icons/Star.svelte';
import CaretLeft from 'reicon-svelte/icons/CaretLeft.svelte';
import CaretRight from 'reicon-svelte/icons/CaretRight.svelte';
import ChevronLeft from 'reicon-svelte/icons/ChevronLeft.svelte';
import ChevronRight from 'reicon-svelte/icons/ChevronRight.svelte';
import AngleDown from 'reicon-svelte/icons/AngleDown.svelte';
import Calendar from 'reicon-svelte/icons/Calendar.svelte';
import Eye from 'reicon-svelte/icons/Eye.svelte';
import EyeSlash from 'reicon-svelte/icons/EyeSlash.svelte';
import List from 'reicon-svelte/icons/List.svelte';
import Search from 'reicon-svelte/icons/Search.svelte';
import Shuffle from 'reicon-svelte/icons/Shuffle.svelte';
import Sliders from 'reicon-svelte/icons/Sliders.svelte';
import Tag from 'reicon-svelte/icons/Tag.svelte';
import UserCircle from 'reicon-svelte/icons/UserCircle.svelte';
import Bank from 'reicon-svelte/icons/Bank.svelte';
import Briefcase from 'reicon-svelte/icons/Briefcase.svelte';
import Buildings from 'reicon-svelte/icons/Buildings.svelte';
import Bus from 'reicon-svelte/icons/Bus.svelte';
import Car from 'reicon-svelte/icons/Car.svelte';
import Coins from 'reicon-svelte/icons/Coins.svelte';
import Coffee from 'reicon-svelte/icons/Coffee.svelte';
import Money from 'reicon-svelte/icons/Money.svelte';
import CreditCard from 'reicon-svelte/icons/CreditCard.svelte';
import Gift from 'reicon-svelte/icons/Gift.svelte';
import MusicNotes from 'reicon-svelte/icons/MusicNotes.svelte';
import Banknote from 'reicon-svelte/icons/Banknote.svelte';
import Pill from 'reicon-svelte/icons/Pill.svelte';
import Airplane from 'reicon-svelte/icons/Airplane.svelte';
import ShoppingCart from 'reicon-svelte/icons/ShoppingCart.svelte';
import VideoFrame2 from 'reicon-svelte/icons/VideoFrame2.svelte';
import GamepadButtons from 'reicon-svelte/icons/GamepadButtons.svelte';
import Graph from 'reicon-svelte/icons/Graph.svelte';
import UserEdit from 'reicon-svelte/icons/UserEdit.svelte';
import MoneyPlus from 'reicon-svelte/icons/MoneyPlus.svelte';
import MemoPlus from 'reicon-svelte/icons/MemoPlus.svelte';
import Edit2 from 'reicon-svelte/icons/Edit2.svelte';
import GridCirclePlus from 'reicon-svelte/icons/GridCirclePlus.svelte';

export type ReiconComponent = any;

/**
 * Mapping nama ikon (kebab-case) ke komponen Reicon Svelte.
 * Import langsung dari subpath agar tree-shakeable dan menghindari
 * barrel `index.js` yang mengekspor `Icon` duplikat.
 */
export const ICON_MAP = {
	// Navigasi
	'home-smile': HomeSmile,
	house: HomeSmile,
	history: History,
	clock: History,
	wallet: Wallet,
	receipt: Receipt,
	'chart-pie': ChartPie,
	'chart-bar': ChartPie,
	'banknote-2': Banknote2,
	scales: Banknote2,
	'category-2': Category2,
	'squares-four': Category2,
	'trash-3': Trash3,
	trash: Trash3,
	'sidebar-2': Sidebar2,
	'sidebar-simple': Sidebar2,

	// Tema
	sun: Sun,
	moon: Moon,
	monitor: Monitor,
	desktop: Monitor,
	mobile: Mobile,
	'device-mobile': Mobile,

	// Aksi sistem
	gear: Gear,
	'logout-4': Logout4,
	'sign-out': Logout4,
	'arrow-counter-clockwise': ArrowDottedRotateAnticlockwise,
	plus: Plus,
	list: List,

	// Menu aksi
	pen: Pen,
	pencil: Pen,
	'trash-4': Trash4,
	more: More,
	'more-h': MoreH,
	'dots-three': More,
	'dots-three-vertical': More,

	// Pengaturan
	'info-square': InfoSquare,
	info: InfoSquare,
	server: Server,
	database: Server,
	'upload-3': Upload3,
	'download-simple': Upload3,
	'user-circle': UserCircle,
	'user-edit': UserEdit,
	'money-plus': MoneyPlus,
	edit2: Edit2,
	'pen-circle': Edit2,
	'memo-plus': MemoPlus,
	'grid-circle-plus': GridCirclePlus,
	sliders: Sliders,

	// Kategori
	'fork-knife': ForkKnife,
	'bowl-food': ForkKnife,
	'bill-list': BillList,
	health: Health,
	heart: Health,
	'mortarboard-square': MortarboardSquare,
	book: MortarboardSquare,
	'bag-shopping': BagShopping,
	'shopping-bag': BagShopping,
	'shopping-cart': ShoppingCart,
	'transfer-h': TransferH,
	'arrows-left-right': TransferH,

	// Transaksi
	'trend-up': TrendUp,
	'chart-line': Graph,
	graph: Graph,
	'trend-down': TrendDown,

	// Kategori tambahan
	'video-frame-2': VideoFrame2,
	'film-strip': VideoFrame2,
	'gaming-buttons': GamepadButtons,
	'gamepad-buttons': GamepadButtons,

	// Lain-lain
	check: Check,
	x: X,
	star: Star,
	'caret-left': CaretLeft,
	'caret-right': CaretRight,
	'chevron-left': ChevronLeft,
	'chevron-right': ChevronRight,
	'caret-down': AngleDown,
	'calendar-blank': Calendar,
	eye: Eye,
	'eye-slash': EyeSlash,
	'magnifying-glass': Search,
	shuffle: Shuffle,
	tag: Tag,
	bank: Bank,
	briefcase: Briefcase,
	buildings: Buildings,
	bus: Bus,
	car: Car,
	coins: Coins,
	coffee: Coffee,
	coin: Money,
	money: Money,
	'credit-card': CreditCard,
	gift: Gift,
	'music-notes': MusicNotes,
	'piggy-bank': Banknote,
	pill: Pill,
	plane: Airplane,
	airplane: Airplane
} as const;

export type MappedIconName = keyof typeof ICON_MAP;

export function resolveIcon(name: string): ReiconComponent | undefined {
	return (ICON_MAP as Record<string, ReiconComponent>)[name];
}

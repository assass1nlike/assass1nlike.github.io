我们把不希望保留的数据来源建模为分布 $p_1$，把希望保留的数据来源建模为分布 $q_1$，在一族候选分布 $\mathcal P$ 中寻找编辑后的分布 $p$，使 $p$ 与 $p_1$ 容易区分，同时 $p$ 与 $q_1$ 难以区分。实际情形是：$p_1,q_1$ 未知，我们只有分别取自二者的有限样本，需要删除一部分 unwanted 样本，再用剩下的数据拟合出 $p$. 因此这里讨论的是删多少、删哪些能达到什么样的统计效果；把指定样本从训练好的模型中移除，属于 sample-level unlearning，是下游的算法问题。

判断两个分布有多容易区分，用的是假设检验的语言。对同一可测空间 $(\mathcal W,\mathcal F_{\mathcal W})$ 上的分布 $P,Q$，考虑检验 $H_0:P$ 与 $H_1:Q$. 随机化检验是可测函数 $\phi:\mathcal W\to[0,1]$，观察到 $w$ 后以概率 $\phi(w)$ 拒绝 $H_0$；它的 type I error 是 $\mathbb E_P[\phi]$，type II error 是 $\mathbb E_Q[1-\phi]$. Trade-off function 定义为

$$
T(P,Q)(u)
=\inf_{\substack{\phi:\mathcal W\to[0,1]\text{ 可测}\\ \mathbb E_P[\phi]\le u}}
\mathbb E_Q[1-\phi],\qquad 0\le u\le1.
$$

这里 $u$ 是允许的 type I error，$T(P,Q)(u)$ 是在这个预算下能达到的最小 type II error。曲线越低，说明在同样的误报预算下越容易把 $Q$ 从 $P$ 中识别出来；由定义 $T(P,Q)(u)\le1-u$（取 $\phi\equiv u$ 即可），而 $T(P,P)(u)=1-u$ 说明同一个分布不含可用于区分的信号。最优检验总是 likelihood ratio 的阈值检验，所以 $T(P,Q)$ 只取决于 $\log(dQ/dP)$ 在两种假设下的分布；后文把无限维实验约化成一维 Gaussian 实验，依据正是这一点。以下所有函数不等式都指在整个 $[0,1]$ 上逐点成立。

给定 removal baseline $f_d=T(P_d,Q_d)$ 与 preservation baseline $f_c=T(P_c,Q_c)$，我们说 $\mathcal P$ 中的分布 $p$ 满足 $(f_d,f_c)$-distributional unlearning，如果

$$
T(p,p_1)\le f_d,\qquad T(p,q_1)\ge f_c.
$$

第一个不等式要求 $p$ 与 unwanted 分布至少像 $P_d$ 与 $Q_d$ 那样容易区分，称为 removal；第二个要求 $p$ 与 retained 分布至多像 $P_c$ 与 $Q_c$ 那样容易区分，称为 preservation。最常用的一组 baseline 取平移 Gaussian 形式：

$$
f_d=T(N(0,1),N(\alpha,1)),\qquad
f_c=T(N(0,1),N(\varepsilon,1)),\qquad \alpha,\varepsilon\ge0.
$$

这里 $\alpha$ 是以标准差为单位的均值差，$\alpha$ 越大 removal 要求越强；$\varepsilon$ 越小 preservation 要求越强。$\alpha=\varepsilon=0$ 时两条要求分别变成 $T(p,p_1)\le1-u$ 与 $T(p,q_1)\ge1-u$，前者自动成立，后者迫使 $p=q_1$，也就是什么都不删只能保持原样。

用一对分布而不是两个散度数值作 baseline，灵活性在于阈值可以按对数据来源的先验知识来选：不同分布族之间可比的尺度不同，硬性规定一个 KL 数值并不总有意义。由于 $T$ 关于第二个分布单调下降，$p$ 满足 $(f_d,f_c)$ 时对任何 $\tilde f_d\ge f_d$、$\tilde f_c\le f_c$ 也满足，论文称之为 consistency。相应的可行域是

$$
\mathcal R
=\left\{p\in\mathcal P:T(p,p_1)\le f_d,\ T(p,q_1)\ge f_c\right\}.
$$

$\mathcal R$ 是否非空、形状如何，是下面各个分布族要算清的对象；算法部分的结论则说明，用有限样本只能达到其中的一个子区域。

**Neyman–Pearson 原理。** 设 $Q\ll P$，$L=dQ/dP$. 对 $c\ge0$，取阈值检验

$$
\phi_*=\mathbf 1_{\{L>c\}}+\tau\mathbf 1_{\{L=c\}},
$$

其中 $\tau\in[0,1]$ 使 $\mathbb E_P[\phi_*]=u$. 对任意满足 $\mathbb E_P[\phi]\le u$ 的检验 $\phi$，有

$$
\begin{aligned}
\mathbb E_Q[\phi_*]-\mathbb E_Q[\phi]
&=\mathbb E_P\big[(L-c)(\phi_*-\phi)\big]
+c\big(\mathbb E_P[\phi_*]-\mathbb E_P[\phi]\big)\\
&\ge0.
\end{aligned}
$$

第一项逐点非负：$\phi_*=1$ 处 $L\ge c$ 且 $\phi_*\ge\phi$，$\phi_*=0$ 处 $L\le c$ 且 $\phi_*\le\phi$；第二项由 $\mathbb E_P[\phi_*]=u\ge\mathbb E_P[\phi]$ 非负。因此给定误报预算时阈值检验最有力：最有力的检验优先拒绝 likelihood ratio 最大的观察值，并在阈值处随机化以恰好用完预算。$Q$ 若有位于 $P$ 支撑之外的部分，就先在这部分拒绝，它不消耗 type I error。对后面所有 location family，$L$ 是观察值的单调函数，最优检验就是拒绝足够大的观察值，这一点会反复用到。

**Blackwell ordering。** 两对分布 $(P,Q)$ 与 $(P',Q')$ 满足 $T(P,Q)\le T(P',Q')$，当且仅当存在同一个 Markov kernel $R$，把 $P$ 变成 $P'$、把 $Q$ 变成 $Q'$：

$$
R\circ P=P',\qquad R\circ Q=Q'.
$$

这里 $R(w,A')$ 是输入 $w$ 时输出落在 $A'$ 的概率，$R\circ P(A')=\int\limits_{\mathcal W}R(w,A')\,dP(w)$ 是输出分布。kernel 存在时，任何用于 $(P',Q')$ 的检验 $\phi'$ 都可以在输入端实施为 $\phi(w)=\int\phi'(w')\,R(w,dw')$，两种错误完全相同，所以输入端能达到的最优曲线不会更高。反过来，曲线更低时存在一个随机处理把前者变成后者，这一步用到条件分布的存在性，证明见 Theorem 19；我们在使用这一等价关系时假设观察空间是 standard Borel 空间，即与某个完备可分度量空间的 Borel 子集可测同构，本文涉及的欧氏空间、可分 Hilbert 空间、连续路径空间与可数乘积空间都满足这一条件。

这套等价关系是后文反复使用的工具：它把关于检验曲线的比较翻译成关于随机处理的存在性陈述，从而让可行域的计算变成 kernel 的构造。反过来，任何在随机处理后不增加的分布差异量，例如 KL、TV 以及一般的 $f$-divergence，都被曲线的排序控制，这正是 Proposition 1、Proposition 2 与 Lemma 20 的内容。

以下按各项结果在论文中首次出现的顺序展开。正文与附录有若干重复陈述，只写一次。有些结果的证明依赖后面才给出的引理，例如 Proposition 3 用到 Lemma 15、Proposition 5 用到 Lemma 28，引用处会说明。论文有几处陈述需要修正才能成立，我们直接给出正确的版本，并指出原文的问题。

## Proposition 1

若 $p$ 满足 $(f_d,f_c)$-distributional unlearning，其中 $f_d=T(P_d,Q_d)$、$f_c=T(P_c,Q_c)$，则

$$
\operatorname{KL}(p_1\Vert p)\ge\operatorname{KL}(Q_d\Vert P_d),
\qquad
\operatorname{KL}(q_1\Vert p)\le\operatorname{KL}(Q_c\Vert P_c).
$$

这里 $\operatorname{KL}(Q\Vert P)=\int\limits\log\dfrac{dQ}{dP}\,dQ$，$Q\not\ll P$ 时取 $+\infty$. 也就是说，检验意义下的 unlearning 蕴含 Allouah et al. 的 $(\alpha,\varepsilon)$-distributional unlearning，其定义正是上面两条 KL 不等式，参数取 $\alpha=\operatorname{KL}(Q_d\Vert P_d)$、$\varepsilon=\operatorname{KL}(Q_c\Vert P_c)$.

**证明。** 由 Blackwell ordering，$T(p,p_1)\le T(P_d,Q_d)$ 给出 kernel $R_d$ 使

$$
R_d\circ p=P_d,\qquad R_d\circ p_1=Q_d;
$$

$T(P_c,Q_c)\le T(p,q_1)$ 给出 kernel $R_c$ 使

$$
R_c\circ P_c=p,\qquad R_c\circ Q_c=q_1.
$$

注意第二个 kernel 的方向与第一个相反：preservation 是从 baseline 出发生成实际的编辑分布。下面用 KL 的 data-processing inequality：对任何 Markov kernel $R$，

$$
\operatorname{KL}(R\circ Q\Vert R\circ P)\le\operatorname{KL}(Q\Vert P).
$$

若 $Q\not\ll P$ 则右侧为 $+\infty$，不等式平凡；设 $Q\ll P$，$L=dQ/dP$，在 $X\sim P$、$Y\mid X\sim R(X,\cdot)$ 的联合分布下，输出的 likelihood ratio 是 $d(R\circ Q)/d(R\circ P)=\mathbb E[L\mid Y]$：对任意可测 $A$，

$$
(R\circ Q)(A)=\mathbb E[1_A(Y)L(X)]=\mathbb E\big[1_A(Y)\,\mathbb E[L\mid Y]\big].
$$

于是由条件 Jensen 不等式（$x\log x$ 凸）与全期望，

$$
\begin{aligned}
\operatorname{KL}(R\circ Q\Vert R\circ P)
&=\mathbb E\big[\mathbb E[L\mid Y]\log\mathbb E[L\mid Y]\big]\\
&\le\mathbb E[L\log L]
=\operatorname{KL}(Q\Vert P).
\end{aligned}
$$

对 $R_d$ 用一次得 $\operatorname{KL}(Q_d\Vert P_d)=\operatorname{KL}(R_d\circ p_1\Vert R_d\circ p)\le\operatorname{KL}(p_1\Vert p)$；对 $R_c$ 用一次得 $\operatorname{KL}(q_1\Vert p)=\operatorname{KL}(R_c\circ Q_c\Vert R_c\circ P_c)\le\operatorname{KL}(Q_c\Vert P_c)$. $\square$

若 baselines 取 Gaussian 形式，则

$$
\operatorname{KL}(Q_d\Vert P_d)=\frac{\alpha^2}{2},
\qquad
\operatorname{KL}(Q_c\Vert P_c)=\frac{\varepsilon^2}{2}.
$$

所以 Gaussian baseline 中的 $\alpha,\varepsilon$ 是以标准差为单位的均值差，KL 阈值是它的平方的一半。这个蕴含关系是单向的：KL 只控制一个差异量，而曲线排序控制所有满足 data-processing 的差异量（Lemma 20），后者严格更强。

## Lemma 2

设 $p$ 相对于 $p_1,q_1$ 满足 $(f_d,f_c)$-unlearning，$p'$ 相对于 $p_1',q_1'$ 满足 $(f_d',f_c')$-unlearning，两种模态的数据以及各自的随机处理相互独立。则乘积分布 $p\otimes p'$ 相对于 $p_1\otimes p_1'$ 与 $q_1\otimes q_1'$ 满足

$$
(f_d\otimes f_d',\ f_c\otimes f_c')\text{-unlearning},
$$

这里 $P\otimes P'$ 是独立乘积分布，而

$$
T(P,Q)\otimes T(P',Q'):=T(P\otimes P',Q\otimes Q').
$$

**证明。** 对 removal，分别把两个模态映射到各自 baseline 的 kernel 可以独立执行。由 Blackwell ordering，存在 $R_d$ 使 $R_d\circ p=P_d$、$R_d\circ p_1=Q_d$，以及 $R_d'$ 使 $R_d'\circ p'=P_d'$、$R_d'\circ p_1'=Q_d'$. 乘积 kernel $R_d\otimes R_d'$ 把 $p\otimes p'$ 送到 $P_d\otimes P_d'$，把 $p_1\otimes p_1'$ 送到 $Q_d\otimes Q_d'$，于是

$$
T(p\otimes p',p_1\otimes p_1')\le T(P_d\otimes P_d',Q_d\otimes Q_d')=f_d\otimes f_d'.
$$

对 preservation，方向相反：存在 $R_c$ 使 $R_c\circ P_c=p$、$R_c\circ Q_c=q_1$，以及 $R_c'$ 使 $R_c'\circ P_c'=p'$、$R_c'\circ Q_c'=q_1'$，乘积 kernel 把 $(P_c\otimes P_c',Q_c\otimes Q_c')$ 送到 $(p\otimes p',q_1\otimes q_1')$，故 $T(p\otimes p',q_1\otimes q_1')\ge f_c\otimes f_c'$. $\square$

这条规则的适用前提是两种模态的数据相互独立：只有此时联合分布才是乘积分布，两个模态的删除决策也才能分别执行。连续应用它可以处理任意有限个独立模态。

论文还用一个外部极限结果说明模态数很大时 baseline 应该怎么选。设每个模态的 baseline 都是 $f_n$，$n$ 个独立模态的组合 baseline 就是 $n$ 重乘积 $f_n^{\otimes n}$. 若 $f_n(0)=1$ 且 $f_n^{\otimes n}$ 在 $[0,1]$ 上逐点收敛到某个 trade-off function $f$，则 $f$ 属于

$$
\mathcal I=
\left\{T(P,Q):
\begin{gathered}
P\text{ 是 }\mathbb R\text{ 上的 infinitely divisible 分布},\\
\int\limits_{\mathbb R}e^x\,dP(x)=1,\quad dQ(x)=e^x\,dP(x)
\end{gathered}
\right\}.
$$

这里 infinitely divisible 指对每个正整数 $m$，$P$ 都能写成某个分布的 $m$ 重卷积。它出现的原因是：独立实验的 log-likelihood ratio 相加，$n$ 个相同模态的 log-likelihood ratio 是 $n$ 个 IID 随机变量之和，这类和在适当归一化下的极限，其 log-likelihood ratio 的分布正是 infinitely divisible 型；条件 $\int e^x\,dP=1$ 等价于 $\mathbb E_Q[1]=1$，保证 $Q$ 仍是概率分布。Gaussian baseline $T(N(0,1),N(\alpha,1))$ 与 Poisson baseline $T(P(\lambda_1),P(\lambda_2))$（$\lambda_1,\lambda_2>0$）都属于 $\mathcal I$，所以模态很多时用这两类 baseline 是自然的。这一引用结果针对的是同一 baseline 的 $n$ 次乘积收敛的情形，异质模态的乘积需要另行论证。

## Proposition 2

若 $p$ 满足 $(f_d,f_c)$-unlearning，$f_d=T(P_d,Q_d)$、$f_c=T(P_c,Q_c)$，则

$$
\operatorname{TV}(p,p_1)\ge\operatorname{TV}(P_d,Q_d),
\qquad
\operatorname{TV}(p,q_1)\le\operatorname{TV}(P_c,Q_c).
$$

这里 total variation distance 是 $\operatorname{TV}(P,Q)=\sup\limits_{A\in\mathcal F_{\mathcal W}}|P(A)-Q(A)|$.

**证明。** 先用一个变分表示：对可测的 $h:\mathcal W\to[-1,1]$，

$$
2\operatorname{TV}(P,Q)
=\sup_{h}\left|\mathbb E_P[h]-\mathbb E_Q[h]\right|.
$$

该表示可由 $P-Q$ 的正负部分得到：$|h|\le1$ 给出上界；取 $h$ 在正部分为 $1$、在负部分为 $-1$，就使右侧等于 $2\operatorname{TV}(P,Q)$. 对任意 $h:\mathcal W'\to[-1,1]$，处理后的函数

$$
(R\circ h)(w)=\int\limits_{\mathcal W'}h(w')\,R(w,dw')
$$

仍取值于 $[-1,1]$，因此

$$
\begin{aligned}
2\operatorname{TV}(R\circ P,R\circ Q)
&=\sup_{|h|\le1}\left|\mathbb E_P[R\circ h]-\mathbb E_Q[R\circ h]\right|\\
&\le\sup_{|g|\le1}\left|\mathbb E_P[g]-\mathbb E_Q[g]\right|
=2\operatorname{TV}(P,Q).
\end{aligned}
$$

随后对 Proposition 1 中的两个 kernel $R_d$、$R_c$ 应用这一 data-processing inequality，就得到两个 TV 不等式。 $\square$

这条结论把分布层面的 unlearning 与下游任务的损失联系起来。Preservation 的上界说明：对任何取值于 $[-1,1]$ 的 loss $h$，$p$ 与 $q_1$ 上的期望 loss 之差不超过 $\operatorname{TV}(P_c,Q_c)$，而且是对一整族 $h$ 同时成立，不是对某个固定预测器。Removal 的下界则说明存在某个这样的函数能区分编辑分布与 unwanted 分布。注意，它不能保证每一个指定预测器的 loss 都上升，也不能仅由绝对差推断变化方向；论文 Remark 6 把它读作 unwanted 域上 loss 增大、retained 域上 loss 减小，这一读法只在存在某个 $h$ 的意义下成立。

对于 Gaussian baseline，两个密度在均值中点 $\alpha/2$ 相交，直接积分得到

$$
\operatorname{TV}(N(0,1),N(\alpha,1))=2\Phi(\alpha/2)-1,
$$

这里 $\Phi$ 是标准 Gaussian 的 CDF.

## Proposition 3

设

$$
p_1=N(\mu_1,\Sigma),\quad q_1=N(\nu_1,\Sigma),\quad
\mathcal P=\left\{N(\mu,\Sigma):\mu\in\mathbb R^d\right\},\quad\Sigma\succ0.
$$

这里 $d$ 是特征维数，$\mu_1,\nu_1$ 是两个数据来源的中心，$\Sigma$ 是共同的正定 covariance matrix，即两个域的特征在同一个坐标系下只有均值不同。采用 baselines

$$
f_d=T(N(0,1),N(\alpha,1)),\qquad
f_c=T(N(0,1),N(\varepsilon,1)),\qquad\alpha,\varepsilon\ge0.
$$

则可行域为

$$
\mathcal R=
\left\{N(\mu,\Sigma):\alpha'(\mu)\ge\alpha,\ \varepsilon'(\mu)\le\varepsilon\right\},
$$

其中 $\alpha'(\mu)$ 与 $\varepsilon'(\mu)$ 分别是候选中心 $\mu$ 到两个域中心的 Mahalanobis 距离：

$$
\begin{aligned}
\alpha'(\mu)^2&=\left\langle\mu_1-\mu,\Sigma^{-1}(\mu_1-\mu)\right\rangle,\\
\varepsilon'(\mu)^2&=\left\langle\nu_1-\mu,\Sigma^{-1}(\nu_1-\mu)\right\rangle.
\end{aligned}
$$

令 $\Delta=\left\|\Sigma^{-1/2}(\mu_1-\nu_1)\right\|_2$，即两个域中心之间的 Mahalanobis 距离。则

$$
\mathcal R\ne\varnothing\iff\alpha\le\Delta+\varepsilon.
$$

**证明。** 第一步把多维 Gaussian 检验约化成一维。对观察值先减去 $\mu$，再乘 $\Sigma^{-1/2}$；这个可逆变换不丢失检验信息。变换后两个分布的 covariance 都是单位阵，只在向量 $\Sigma^{-1/2}(\mu_1-\mu)$ 的方向上存在均值差，其余方向上的坐标在两种假设下同分布、相互独立，对区分没有帮助，可以丢弃或由随机处理生成（这正是 Lemma 15 中"维度无关"的来源）。投影到该方向后，likelihood ratio 与原观察值的 likelihood ratio 相同，因此

$$
\begin{aligned}
T(N(\mu,\Sigma),N(\mu_1,\Sigma))
&=T(N(0,1),N(\alpha'(\mu),1)),\\
T(N(\mu,\Sigma),N(\nu_1,\Sigma))
&=T(N(0,1),N(\varepsilon'(\mu),1)).
\end{aligned}
$$

一维情形的曲线有显式形式。两单位方差 Gaussian 的 likelihood ratio 是 $x\mapsto e^{sx-s^2/2}$，关于 $x$ 单调递增，由 Neyman–Pearson 最优检验是拒绝大于 $\Phi^{-1}(1-u)$ 的观察值，所以

$$
T(N(0,1),N(s,1))(u)=\Phi\!\left(\Phi^{-1}(1-u)-s\right),\qquad s\ge0.
$$

对每个 $0<u<1$，右侧随 $s$ 严格递减，因此 $T(N(0,1),N(\alpha'(\mu),1))\le f_d$ 与 $\alpha'(\mu)\ge\alpha$ 等价，第二个约束同理。函数层面的约束于是恰好变成两个距离约束。

第二步解这两个距离约束。在 whitened coordinates 中，可行中心位于以 $\nu_1$ 为中心的闭 $\varepsilon$-球内，同时位于以 $\mu_1$ 为中心的开 $\alpha$-球外。对球内任意中心，三角不等式给出

$$
\left\|\Sigma^{-1/2}(\mu-\mu_1)\right\|_2\le\Delta+\varepsilon.
$$

反过来，若 $\Delta>0$，取

$$
\mu=\nu_1+\frac{\varepsilon}{\Delta}(\nu_1-\mu_1)
$$

即从 $\nu_1$ 沿背离 $\mu_1$ 的方向移动 $\varepsilon$，到 $\mu_1$ 的距离恰好是 $\Delta+\varepsilon$，落在 preservation 球边界上；若 $\Delta=0$，两球同心，取距共同中心 $\varepsilon$ 的任意方向即可。这证明非空条件。 $\square$

preservation 球内距 unwanted 中心最近的点距离为 $\max\{\Delta-\varepsilon,0\}$，因此整个 preservation 球都可行的准确条件是

$$
\alpha\le\max\{\Delta-\varepsilon,0\}.
$$

对于 $\alpha>0$，这就是 $\alpha\le\Delta-\varepsilon$；$\alpha=0$ 时 removal 约束恒成立。其余非空情形，$\mathcal R$ 是球面与球体的交，即一个球冠或环状带；在一维中则可能是两个区间，见 Proposition 10 的注记，不能一概称为单个 cap.

## Lemma 8

在 Proposition 3 的设定下，固定 preservation 预算 $\varepsilon$ 时，可达到的最大 removal 距离是 $\Delta+\varepsilon$. 因而论文所定义的 frontier，即所有"最大 removal 与 preservation 联合可达"的参数对，为

$$
\operatorname{PF}(p_1,q_1,\mathcal P)
=\left\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\right\}.
$$

**证明。** Proposition 3 的三角不等式给出上界：任何满足 $\varepsilon'(\mu)\le\varepsilon$ 的 $\mu$ 都有 $\alpha'(\mu)\le\Delta+\varepsilon$. 取

$$
\mu=\nu_1+\frac{\varepsilon}{\Delta}(\nu_1-\mu_1)
$$

则 $\varepsilon'(\mu)=\varepsilon$、$\alpha'(\mu)=\Delta+\varepsilon$，上界可达。 $\square$

这张 frontier 的读法是：preservation 误差每增加 $1$ 个单位，removal 最多能多出 $1$ 个单位。这解释了为什么只保留 $q_1$ 并非所有目标下的最佳选择：$p=q_1$ 对应 $\varepsilon=0$、$\alpha=\Delta$，中心越过 $\nu_1$ 继续背离 $\mu_1$ 移动，就能用一些 preservation 损失换取更强的 removal。$\Delta$ 是两个域本身的可分程度，它决定了 frontier 的起点。

## Proposition 4

令 $H=L^2([0,1])$，内积为 $\langle f,g\rangle_H=\int\limits_0^1 f(t)g(t)\,dt$. Gaussian white noise model 的观察是

$$
dY_t=f(t)\,dt+dB_t,\qquad 0\le t\le1,
$$

这里 $f\in H$ 是信号，$B_t$ 是标准 Brownian motion，$p_f$ 是整条观察路径的分布。等价地，对每个 $\phi\in H$，我们观察

$$
Y_f(\phi)=\int\limits_0^1\phi(t)f(t)\,dt+W(\phi),\qquad
\mathbb E[W(\phi)W(\psi)]=\langle\phi,\psi\rangle_H.
$$

这里 $W(\phi)=\int\limits_0^1\phi(t)\,dB_t$ 是 Wiener integral. 它先对分段常数函数定义为 Brownian increments 的加权和，再用 $\mathbb E[W(\phi)^2]=\|\phi\|_H^2$ 延拓到 $H$. 因此 white noise 是一族 Gaussian 随机变量，并非取值于 $L^2$ 的普通随机函数；写成过程 $dY_t$ 只是为了直观。

设 unwanted 与 retained 分布分别为 $p_f,p_g$，候选族为 $\mathcal P=\{p_h:h\in H\}$，采用与 Proposition 3 相同的 Gaussian baselines. 则

$$
\mathcal R=\left\{p_h:\|f-h\|_H\ge\alpha,\ \|g-h\|_H\le\varepsilon\right\}.
$$

令 $\Delta=\|f-g\|_H$，则非空条件为 $\alpha\le\Delta+\varepsilon$，frontier 仍为 $\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\}$. 整个以 $g$ 为中心的 preservation 球都可行，当且仅当 $\alpha\le\max\{\Delta-\varepsilon,0\}$.

**证明。** 先说明无限维观察为何仍归结为一个实数。取 $H$ 的 orthonormal basis $\{e_j\}_{j\ge1}$，坐标观察 $Y_f(e_j)$ 独立且服从 $N(\langle f,e_j\rangle_H,1)$，即一个可数维的 Gaussian shift 实验。前 $m$ 个坐标的 log-likelihood ratio 是

$$
\sum\limits_{j=1}^{m}\langle g-f,e_j\rangle_H
\left(Y_f(e_j)-\langle f,e_j\rangle_H\right)
-\frac12\sum\limits_{j=1}^{m}\langle g-f,e_j\rangle_H^2.
$$

由于 $g-f\in H$，随机和在 $L^2$ 中收敛到 $W(g-f)$，确定性和收敛到 $\|g-f\|_H^2$. 对应的 likelihood ratios 记作 $L_m$，它们在 $p_f$ 下的二阶矩满足

$$
\mathbb E_{p_f}[L_m^2]=\exp\!\left(\sum\limits_{j=1}^{m}\langle g-f,e_j\rangle_H^2\right)
\le\exp\!\left(\|g-f\|_H^2\right),
$$

所以 $\{L_m\}$ 一致可积，$L_m$ 的极限期望仍为 $1$，确实是整个观察的 Radon–Nikodym derivative（这是可数维 Gaussian shift 实验的标准结论，也是 Cameron–Martin 定理的离散化版本）。从而

$$
\log\frac{dp_g}{dp_f}(Y)
=\int\limits_0^1(g-f)(t)\,dY_t
-\frac{\|g\|_H^2-\|f\|_H^2}{2}.
$$

代入两种假设下的 $dY_t$，得到

$$
\begin{aligned}
\log\frac{dp_g}{dp_f}(Y)&\sim N(-\Delta^2/2,\Delta^2)&&\text{在 }p_f\text{ 下},\\
\log\frac{dp_g}{dp_f}(Y)&\sim N(\Delta^2/2,\Delta^2)&&\text{在 }p_g\text{ 下}.
\end{aligned}
$$

最优检验只需要这个 likelihood ratio，因此

$$
T(p_f,p_g)=T(N(0,1),N(\Delta,1)).
$$

对 $h,f$ 和 $h,g$ 分别应用这一结果，得到距离形式。Hilbert 空间的三角不等式给出非空条件的必要性，取 $h=g+\varepsilon(g-f)/\Delta$ 给出 $\Delta>0$ 时的充分性；$\Delta=0$ 时任选单位方向。 $\square$

这个结论说明 Proposition 3 的几何不是有限维的偶然：无限维非参数模型中可行域的形状完全相同，只是把 Mahalanobis 距离换成 $L^2$ 距离。代价是可行域不再能用有限个参数描述，前沿上的每一个点都对应信号空间中一个具体的方向；但在固定方向上的截面仍与有限维情形同构，这正是可以把 Proposition 3 的论证逐字搬过来的原因。

## Proposition 5

令 $P(\mu)$ 表示均值为 $\mu>0$ 的 Poisson 分布，即 $P(\mu)\{k\}=e^{-\mu}\mu^k/k!$. 设

$$
p_1=P(\mu_1),\quad q_1=P(\nu_1),\quad
\mathcal P=\{P(\mu):\mu>0\},
$$

并采用 $f_d=T(P(1),P(\alpha))$、$f_c=T(P(1),P(\varepsilon))$，其中 $\alpha>1$、$0<\varepsilon<1$. 两个 baseline 都以 $P(1)$ 为参照点，$\alpha>1$ 与 $\varepsilon<1$ 分别要求编辑后的均值相对参照点向两侧偏离，与 unwanted、retained 两个域的相对位置一致。则可行均值为

$$
\mathcal R_P=
\left[\nu_1,\ \min\left\{\frac{\mu_1}{\alpha},\mu_1-\alpha+1,
\frac{\nu_1}{\varepsilon},\nu_1-\varepsilon+1\right\}\right],
$$

区间非空当且仅当

$$
\nu_1\le\min\left\{\frac{\mu_1}{\alpha},\mu_1-\alpha+1\right\}.
$$

**证明。** Poisson 族不是 location family，但存在两类保持 Poisson 性的随机处理。第一类是 thinning：把计数 $X$ 中的每个事件以概率 $s\in[0,1]$ 独立保留；第二类是 superposition：再加入独立的 $P(r)$ 噪声，$r\ge0$. 输出均值从 $\theta$ 变为 $s\theta+r$. 前者成立是因为 probability generating function 为

$$
\mathbb E[z^{B(X,s)}]
=\mathbb E[(1-s+sz)^X]
=\exp(s\theta(z-1)),
$$

这里 $B(X,s)$ 是给定 $X$ 后的 Binomial 随机变量，最后一步代入了 $X\sim P(\theta)$ 的 $\mathbb E[(1-s+sz)^X]$；后者成立是因为独立 Poisson 的 probability generating functions 相乘后仍为 Poisson 的形式。

Lemma 28 会证明：一个 Poisson 二元实验能够经随机处理变成另一个，当且仅当存在上述形式的 $s,r$. 依据是 Blackwell ordering，而 thinning 与 superposition 恰好构成了所有可能的这类 kernel。因而 removal 与 preservation 分别等价于存在 $s_1,s_2\in[0,1]$、$r_1,r_2\ge0$ 使

$$
1=s_1\mu+r_1,\quad\alpha=s_1\mu_1+r_1;
\qquad
\mu=s_2+r_2,\quad\nu_1=s_2\varepsilon+r_2.
$$

这里第一组等式表示把 $P(\mu),P(\mu_1)$ 分别处理成 $P(1),P(\alpha)$，第二组表示从 $P(1),P(\varepsilon)$ 生成 $P(\mu),P(\nu_1)$，方向与 preservation 的定义一致。

第一对等式给出 $s_1=(\alpha-1)/(\mu_1-\mu)$，从而 $\mu<\mu_1$. 条件 $0\le s_1\le1$ 与 $r_1=1-s_1\mu\ge0$ 依次给出

$$
\mu\le\mu_1-\alpha+1,\qquad \mu\le\mu_1/\alpha.
$$

第二对等式给出 $s_2=(\mu-\nu_1)/(1-\varepsilon)$. 条件 $0\le s_2\le1$ 与 $r_2=\mu-s_2\ge0$ 给出

$$
\nu_1\le\mu\le\nu_1+1-\varepsilon,\qquad \mu\le\nu_1/\varepsilon.
$$

相交即得所述区间。由于 preservation 的两个上端点都不小于 $\nu_1$，非空性只取决于 removal 的两个上界。 $\square$

对于计数型特征，例如一段文本中特定词语的出现次数，这个可行域同时约束均值差与均值比：$\mu\le\mu_1/\alpha$ 是比例约束，$\mu\le\mu_1-\alpha+1$ 是绝对差约束。仅用均值间的一个距离不足以描述可区分性，这是 Poisson 与 Gaussian 情形最本质的不同。

## Proposition 6

现在我们只观察有限数据。设两组相互独立的样本分别来自 $p_1=N(\mu_1,\sigma^2I_d)$、$q_1=N(\nu_1,\sigma^2I_d)$，样本数为 $n_1,n_2$，$\sigma>0$ 已知。从第一组中独立于数据值均匀删除 $n_r$ 个样本，令 $n_1'=n_1-n_r\ge1$. 两组剩余样本的均值记为 $\hat\mu_1',\hat\nu_1$，编辑分布为 $p=N(\mu,\sigma^2I_d)$，其中

$$
\mu=\frac{n_1'\hat\mu_1'+n_2\hat\nu_1}{n_1'+n_2}.
$$

这里合并数据的 Gaussian log-likelihood 只依赖平方残差之和，对 $\mu$ 求导即可得到上述 MLE；它不是两个真实分布混合后的精确分布，而是对剩余数据拟合的共同方差 Gaussian，是用样本近似可行域中某个点的产物。

沿用论文的函数

$$
\gamma(n,d,\delta)=\frac1{\sqrt n}
\sqrt{d+2\sqrt{d\log(1/\delta)}+2\log(1/\delta)},
\qquad 0<\delta<1,
$$

它是 $d$ 维 Gaussian 样本均值误差的高概率尺度：取 $t=\log(1/\delta)$ 时 Laurent–Massart 界给出 $\mathbb P(\|\hat\mu-\mu\|_2>\sigma\gamma(n,d,\delta))\le\delta$（Lemma 37）。下面的推导要对两次估计各用一次，为保证总失败概率不超过 $\delta$，每次取 $\gamma(\cdot,\cdot,\delta/2)$，即把公式中的 $\delta$ 换成 $\delta/2$. 并令 $\sigma\Delta=\|\mu_1-\nu_1\|_2$. 定义

$$
\begin{aligned}
\varepsilon_m(R)
&=\frac{n_1'\Delta}{n_1'+n_2}
+\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2},\\
\alpha_M(R)&=\Delta-\varepsilon_m(R).
\end{aligned}
$$

这里 $\varepsilon_m(R)$ 是 preservation 能保证的误差上界，$\alpha_M(R)$ 是 removal 能保证的下界，下标 $m$ 与 $M$ 分别提醒它们是最小与最大一侧的界。则以至少 $1-\delta$ 的概率，所有满足 $0\le\alpha\le\alpha_M(R)$、$\varepsilon\ge\varepsilon_m(R)$ 的 Gaussian baselines 同时达到 unlearning.

**证明。** 删除索引与样本值独立，故剩余 unwanted 样本仍为 IID. Lemma 37 的 Gaussian 均值界与 union bound 给出同一事件，概率至少为 $1-\delta$，其上

$$
\|\hat\mu_1'-\mu_1\|_2\le\sigma\gamma(n_1',d,\delta/2),\qquad
\|\hat\nu_1-\nu_1\|_2\le\sigma\gamma(n_2,d,\delta/2).
$$

在这一事件上，直接展开

$$
\begin{aligned}
\|\mu-\nu_1\|_2
&=\left\|\frac{n_1'}{n_1'+n_2}(\mu_1-\nu_1)
+\frac{n_1'}{n_1'+n_2}(\hat\mu_1'-\mu_1)
+\frac{n_2}{n_1'+n_2}(\hat\nu_1-\nu_1)\right\|_2\\
&\le\sigma\varepsilon_m(R),\\
\|\mu-\mu_1\|_2
&\ge\|\mu_1-\nu_1\|_2-\|\mu-\nu_1\|_2
\ge\sigma\alpha_M(R).
\end{aligned}
$$

Proposition 3 将两条距离界转成所需的 trade-off bounds. $\square$

注意，$\gamma$ 的公式本身没有笔误，只是常数约定容易混淆：$\gamma(n,d,\delta)$ 对应失败概率 $\delta$，于是两次估计合计 $\delta$ 时每次要用 $\delta/2$，此时函数式为 $\gamma(n,d,\delta/2)=n^{-1/2}\sqrt{d+2\sqrt{d\log(2/\delta)}+2\log(2/\delta)}$. 若 $n_1'=0$，直接令 $\mu=\hat\nu_1$，只应用一次均值界即可，无需计算未定义的 $\gamma(0,d,\delta)$.

上述推导还给出两个方向的控制：

$$
\begin{aligned}
\left|\frac{\|\mu-\nu_1\|_2}{\sigma}-\frac{n_1'\Delta}{n_1'+n_2}\right|
&\le\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2},\\
\left|\frac{\|\mu-\mu_1\|_2}{\sigma}-\frac{n_2\Delta}{n_1'+n_2}\right|
&\le\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2}.
\end{aligned}
$$

因此，当估计误差趋于零时，random removal 的中心仍位于两个总体中心之间，表现趋于 $(\alpha,\varepsilon)=(n_2\Delta/(n_1'+n_2),n_1'\Delta/(n_1'+n_2))$. 这与 Lemma 8 中可以越过 retained 中心的信息论最优构造不同：算法只用加权均值，能到达的位置被限制在连线上的一个凸组合。不过，这只证明该特定算法的限制，并未证明所有高效算法都存在 computational hardness barrier.

## Proposition 7

在 Proposition 6 的采样设定下，selective removal 先计算 $\hat\nu_1$，然后删除距 $\hat\nu_1$ 最远的 $n_r$ 个 unwanted 样本，再用剩余样本拟合同样的加权均值 $\mu$. 直观上，unwanted 域中离 retained 中心最远的样本最能拉偏均值，删掉它们能把编辑分布推向 $q_1$ 一侧。令

$$
d(n,\delta)=\sqrt{\frac{\log(4/\delta)}{2n}},\qquad
F_1(t)=\mathbb P\!\left(\|\sigma Z+\mu_1-\nu_1\|_2\le t\right),\quad Z\sim N(0,I_d).
$$

这里 $F_1$ 是单个 unwanted 样本到真实 retained 中心的距离的分布，$F_1^{-1}(u)=\inf\{t\ge0:F_1(t)\ge u\}$ 是分位数；$d(n,\delta)$ 是 empirical CDF 的一致误差界（Lemma 44），不是维数 $d$. 假设

$$
1\le n_1'\le n_1,\qquad
\frac{n_1'}{n_1}+d(n_1,\delta)<1.
$$

第二个条件保证所需的分位点落在 $(0,1)$ 内，否则下面的上界没有意义。则以至少 $1-\delta$ 的概率，所有 $0\le\alpha\le\alpha_M(S)$、$\varepsilon\ge\varepsilon_m(S)$ 都可保证 unlearning，其中

$$
\begin{aligned}
\varepsilon_m(S)
&=\frac{n_1'}{\sigma(n_1'+n_2)}
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+2\gamma(n_2,d,\delta/2),\\
\alpha_M(S)&=\Delta-\varepsilon_m(S).
\end{aligned}
$$

**证明。** 对每个 unwanted 样本，到真实 retained 中心与到估计中心的距离至多相差 $\|\hat\nu_1-\nu_1\|_2$. 这种逐项误差也控制排序后的第 $n_1'$ 小距离：若至少 $n_1'$ 个真实距离不超过 $t$，则这 $n_1'$ 个样本的估计距离都不超过 $t+\|\hat\nu_1-\nu_1\|_2$，因此被保留下来的样本的估计距离也不超过该值。

以失败概率 $\delta/2$ 使用 DKW inequality，真实距离的经验 CDF 与 $F_1$ 之差处处不超过 $d(n_1,\delta)$. 因而第 $n_1'$ 小真实距离不超过

$$
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right).
$$

再以失败概率 $\delta/2$ 控制 $\hat\nu_1$，得到一个概率至少为 $1-\delta$ 的共同事件。在该事件上，所有留下的 unwanted 样本距 $\hat\nu_1$ 都不超过

$$
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\sigma\gamma(n_2,d,\delta/2).
$$

均值位于这些点的 convex hull 内，所以到 $\hat\nu_1$ 的距离满足同一上界。于是

$$
\begin{aligned}
\|\mu-\nu_1\|_2
&\le\frac{n_1'}{n_1'+n_2}\|\hat\mu_1'-\hat\nu_1\|_2+\|\hat\nu_1-\nu_1\|_2\\
&\le\frac{n_1'}{n_1'+n_2}
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\left(1+\frac{n_1'}{n_1'+n_2}\right)\sigma\gamma(n_2,d,\delta/2)\\
&\le\sigma\varepsilon_m(S).
\end{aligned}
$$

最后用 $\|\mu-\mu_1\|_2\ge\sigma\Delta-\|\mu-\nu_1\|_2$ 得到 removal 界。 $\square$

分位数条件保证这里的上界有限；若分位数参数达到或超过 $1$，原式不能给出有限保证。证明还说明 $2\gamma$ 可以保留为较紧的 $\left(1+n_1'/(n_1'+n_2)\right)\gamma$，Proposition 16 用的正是这个版本。注意，$\varepsilon_m(S)$ 是可证明的上界，不能据此断言更小的 preservation 误差实际无法达到；后文 Lemma 46 的注记会说明为什么反向的下界难以得到。

## Lemma 15

Gaussian trade-off function 记为

$$
f_{G,\varepsilon}(u)=T(N(0,1),N(\varepsilon,1))(u)
=\Phi\!\left(\Phi^{-1}(1-u)-|\varepsilon|\right),\qquad \varepsilon\in\mathbb R.
$$

显式公式已在 Proposition 3 中由阈值检验得到。它满足以下性质。

第一，对非负参数，$\varepsilon_1\le\varepsilon_2$ 当且仅当 $f_{G,\varepsilon_1}\ge f_{G,\varepsilon_2}$ 在整个 $[0,1]$ 上成立。也就是说，两个函数在不可数多个点上的比较，被归结为两个实数的比较。这一点在取交、取并时反复使用。

第二，交换两个具有共同 covariance 的 Gaussian 不改变 trade-off function：若 $\mu_1,\nu_1\in\mathbb R^p$，则

$$
T(\nu_1+N(0,I_p),\mu_1+N(0,I_p))
=T(\mu_1+N(0,I_p),\nu_1+N(0,I_p)).
$$

一般地 $T(P,Q)$ 关于两个变元是不对称的，平移 Gaussian 之所以对称，是因为标准 Gaussian 密度在正交变换下不变，似然比在所有方向上同等对待。

第三，对任意非空指标集 $I$，若 $\sup_{i\in I}|\varepsilon_i|<\infty$，则

$$
\inf_{i\in I}f_{G,\varepsilon_i}(u)
=f_{G,\sup_{i\in I}|\varepsilon_i|}(u).
$$

一族 Gaussian 曲线的逐点下确界仍是一条 Gaussian 曲线，参数取上确界。

第四，维度无关：若 $\Sigma\succ0$ 且 $\varepsilon^2=\langle\mu_1-\nu_1,\Sigma^{-1}(\mu_1-\nu_1)\rangle$，则

$$
T(N(\mu_1,\Sigma),N(\nu_1,\Sigma))=f_{G,\varepsilon}.
$$

也就是说，$d$ 维 Gaussian 检验的曲线只依赖 Mahalanobis 距离，不依赖维数。这是高维情形仍然可用的关键：控制误差的量没有随维数增长。

**证明。** 正参数时的显式公式已在 Proposition 3 中由阈值检验得到；对负参数，将观察值乘 $-1$，分布对变成 $(N(0,1),N(|\varepsilon|,1))$，得到参数 $|\varepsilon|$，这同时给出对称性。对 $0<u<1$，$\Phi$ 严格递增，因而公式对 $|\varepsilon|$ 严格递减，这证明排序的两个方向。

对有界的参数族，取趋近参数上确界的序列，再用 $\Phi$ 的连续性，就得到逐点下确界公式。

对于共同 covariance 的多维 Gaussian，whitening 后可再作 orthogonal rotation，把均值差旋转到第一坐标。其余坐标在两种假设下相同且独立，可以被丢弃，也可以独立生成，因此它们不改变检验能力，剩余第一坐标就是距离参数为 $\varepsilon$ 的一维实验。交换两个均值不改变该距离，故也不改变曲线。 $\square$

注意，参数无界时，逐点下确界在 $u=0$ 等于 $1$，在 $u>0$ 等于 $0$；它不是某个有限距离的 Gaussian trade-off function. 所以把下确界仍写成同一有限参数族成员，需要上面的有界条件。

## Lemma 16

设随机变量 $X$ 关于 $0$ 对称，具有 log-concave density 和 CDF $F$. Log-concave 指 density $\rho$ 满足

$$
\rho(\lambda x+(1-\lambda)y)
\ge\rho(x)^\lambda\rho(y)^{1-\lambda},\qquad 0<\lambda<1.
$$

其支撑是一个区间；在支撑内部，等价地 $\log\rho$ 为凹函数。Gaussian、Laplace、uniform 的密度都 log-concave，很多常见噪声因此都落在这个框架内。对任意 $t_1,t_2\in\mathbb R$，令 $\delta=|t_2-t_1|$，则

$$
T(t_1+X,t_2+X)(u)
=F\!\left(F^{-1}(1-u)-\delta\right)
=T(t_2+X,t_1+X)(u).
$$

这里 $t+X$ 表示相应随机变量的分布，$F^{-1}$ 为分位数，端点按单侧极限取值。记 $f_{X,\varepsilon}=T(X,\varepsilon+X)$，则对于 $\varepsilon_1,\varepsilon_2\ge0$，

$$
\varepsilon_1\le\varepsilon_2\quad\Longrightarrow\quad
f_{X,\varepsilon_1}\ge f_{X,\varepsilon_2}.
$$

若支撑为整个 $\mathbb R$，上述蕴含是等价关系。若支撑闭包为 $[-a,a]$、$0<a<\infty$，准确关系是

$$
f_{X,\varepsilon_1}\ge f_{X,\varepsilon_2}
\iff
\min\{\varepsilon_1,2a\}\le\min\{\varepsilon_2,2a\}.
$$

**证明。** 先考虑正向平移 $\delta>0$. 在两 density 都为正的区域，log-likelihood ratio 是 $\log\rho(x-\delta)-\log\rho(x)$. 凹函数在更靠左的区间上具有更大的增量，所以这个差随 $x$ 不减；这个结论的出处是：设 $g=\log\rho$ 凹，则 $g'(x-\delta)\ge g'(x)$（左导数在左时更大），于是

$$
\frac{d}{dx}\big[g(x-\delta)-g(x)\big]
=g'(x-\delta)-g'(x)\ge0.
$$

不可微时用凹函数的左右导数得到同一结论。支撑以外的零 density 按 likelihood ratio 为 $0$ 或 $+\infty$ 处理。因此 Neyman–Pearson 检验仍优先拒绝较大的 $x$. 在 $X$ 下选阈值 $F^{-1}(1-u)$，在 $\delta+X$ 下接受的概率正是 $F(F^{-1}(1-u)-\delta)$. 平移不改变检验；反射与 $X\overset d=-X$ 则把负向平移变成正向平移，并证明交换分布的对称性。

单调性直接来自 $F$ 不减。若 $F$ 在整个实线上严格递增，任何两个不同距离都在 $0<u<1$ 处产生严格不同的曲线。若支撑为 $[-a,a]$，距离达到 $2a$ 后，两分布已互相奇异，曲线恒为 $0$. 在 $0\le\varepsilon_1<\varepsilon_2<2a$ 时，可选择一个阈值，使平移后的两个阈值在支撑内部或其中一个刚低于左端点，得到严格的 CDF 差。因此不同距离只有在都达到 $2a$ 后才会给出同一条曲线。 $\square$

注意，uniform 分布属于 symmetric log-concave 分布；对支撑为 $[-a,a]$ 的噪声，平移超过 $2a$ 后两分布完全分离，继续增加距离不会增强已经完美的可区分性。这是原文无条件使用严格参数排序所遗漏的情形，后文 Proposition 10 与 Proposition 12 会用到截断后的版本。

## Lemma 17

对非增函数 $h:[0,1]\to[0,1]$，定义 generalized inverse

$$
h^{-1}(t)=\inf\{u\in[0,1]:h(u)\le t\},\qquad \inf\varnothing:=1.
$$

若 $f,g:[0,1]\to[0,1]$ 非增且 $f\le g$，则 $f^{-1}\le g^{-1}$.

**证明。** 对任意 $t$，$g(u)\le t$ 蕴含 $f(u)\le t$，因此

$$
\{u:g(u)\le t\}\subseteq\{u:f(u)\le t\}.
$$

右侧集合更大，其下确界不大于左侧集合的下确界。约定空集下确界为 $1$ 后，结论在端点同样成立。 $\square$

对 trade-off functions 还有 $T(P,Q)^{-1}=T(Q,P)$. 因为检验 $\phi$ 的两种错误为 $(\mathbb E_P[\phi],\mathbb E_Q[1-\phi])$；交换假设后使用 $1-\phi$，错误对恰好交换。最优错误边界因此关于两个坐标的交换反射，而反射后的函数正好是上述 generalized inverse. 这个恒等式在做 preservation 与 removal 的对称推理时会用到，例如把 $T(P_c,Q_c)\le T(p,q_1)$ 翻成 $T(q_1,p)\le T(Q_c,P_c)$.

## Theorem 19

对 standard Borel 空间上的两对分布 $(P,Q)$、$(P',Q')$，以下两件事等价：

$$
T(P,Q)\le T(P',Q');
\qquad
\exists R:\ R\circ P=P',\ R\circ Q=Q'.
$$

**证明。** 若 kernel 存在，任意输出检验 $\phi'$ 都可以在输入端实施：使用拒绝概率 $R\circ\phi'$. 两种错误完全相同，故输入端能达到的最优 type II error 不会更大。这证明容易的方向。

反方向要说明整条检验曲线为何足以重构一个随机处理。为此我们使用 convex order 的 martingale coupling theorem：若两个取值于 $[0,1]$ 的随机变量 $U,U'$ 具有相同均值，且对所有凸函数 $\psi$ 都有 $\mathbb E[\psi(U)]\ge\mathbb E[\psi(U')]$，则存在具有这两个边缘分布的 coupling，使

$$
\mathbb E[U\mid U']=U'.
$$

这一工具的含义是：分布更集中的 $U'$ 可以看成较分散的 $U$ 的条件均值，即对 $U$ 作一次随机处理后得到 $U'$. 在紧区间上，要检验这个凸函数族，只需检验 $\psi(u)=(u-t)_+$ 和均值；因为分段线性凸函数是这些函数与 affine 函数的非负线性组合，一般凸函数再由分段线性函数逼近。这里 $(x)_+=\max\{x,0\}$. 在证明中它把"曲线的逐点比较"转换成"后验概率的 convex order"，后者才是可以构造 kernel 的对象。

令 $M=(P+Q)/2$，在 $W\sim M$ 下定义

$$
U(W)=\frac{dQ}{d(P+Q)}(W).
$$

这里 $U$ 是两种假设先验概率各为 $1/2$ 时，观察到 $W$ 后 $H_1$ 的 posterior probability；$dQ/dM=2U$，$dP/dM=2(1-U)$，且 $\mathbb E_M[U]=1/2$. 对 $(P',Q')$ 同样定义 $M',U'$.

在 $M$ 下，检验的两种错误与收益都可以用 $M$ 的密度改写：$\mathbb E_Q[\phi]=2\mathbb E_M[U\phi]$、$\mathbb E_P[\phi]=2\mathbb E_M[(1-U)\phi]$，所以 $\mathbb E_Q[\phi]-c\mathbb E_P[\phi]=\mathbb E_M[\phi(2U-c)]$. 对任意 $c\ge0$，最优加权检验收益为

$$
\begin{aligned}
\sup_{0\le\phi\le1}\left(\mathbb E_Q[\phi]-c\mathbb E_P[\phi]\right)
&=\sup_{0\le u\le1}\left(1-T(P,Q)(u)-cu\right)\\
&=2\mathbb E_M\!\left[((1+c)U-c)_+\right].
\end{aligned}
$$

第一步是在每个误报预算下取最大 power，即用 $T$ 的定义；第二步对被积函数逐点选择 $\phi=1$ 或 $0$，具体地，$\mathbb E_Q[\phi]-c\mathbb E_P[\phi]=\mathbb E_M[\phi(2U-c)]$，逐个 $\omega$ 取 $\phi=1$ 当且仅当 $2U\ge c$. 这个等式把曲线比较与 $M$ 下后验变量的矩联系起来。由 $T(P,Q)\le T(P',Q')$，这个收益不小于 primed 实验的收益。令 $t=c/(1+c)$，便得到所有 $0\le t<1$ 的 stop-loss 不等式

$$
\mathbb E_M[(U-t)_+]\ge\mathbb E_{M'}[(U'-t)_+].
$$

均值相同，所以 $U$ 在 convex order 下支配 $U'$. 由上述工具，取一个满足 $\mathbb E[U\mid U']=U'$ 的 coupling.

现在构造 kernel：输入 $w$ 后先算 $u=U(w)$，按 coupling 中 $U'\mid U=u$ 的条件分布抽样 $u'$，再按 $M'$ 下 $W'\mid U'=u'$ 的条件分布抽样 $w'$. Standard Borel 条件保证这些抽样规则可写成 Markov kernels. 对任意有界可测函数 $h$，这个 kernel 在输入服从 $Q$ 时给出

$$
\begin{aligned}
\mathbb E_{R\circ Q}[h(W')]
&=\mathbb E\!\left[2U\,\mathbb E_{M'}[h(W')\mid U']\right]\\
&=\mathbb E\!\left[2U'\,\mathbb E_{M'}[h(W')\mid U']\right]
=\mathbb E_{Q'}[h(W')].
\end{aligned}
$$

第二个等号用到 $\mathbb E[U\mid U']=U'$；最后一个等号用到 $dQ'=2U'\,dM'$. 把 $2U$ 换成 $2(1-U)$，同样得到输入 $P$ 时输出 $P'$. 因而所需 kernel 存在。 $\square$

这个定理是整套框架的理论支点：它保证"检验曲线更低"与"存在保持信息的随机处理"是同一件事，因此上面的可行域既是信息论上可达到的分布集合，也是可以用算法去逼近的目标。

## Lemma 20

设二元分布泛函 $D(P,Q)$ 对任意 Markov kernel 都满足

$$
D(R\circ P,R\circ Q)\le D(P,Q).
$$

则存在定义在 trade-off functions 上的泛函 $\ell_D$，使

$$
D(P,Q)=\ell_D(T(P,Q)),\qquad
f\le g\Longrightarrow\ell_D(f)\ge\ell_D(g).
$$

**证明。** 若两对分布的 trade-off functions 相同，Theorem 19 在两个方向各给出一个 kernel. 两次 data processing 给出 $D(P,Q)\ge D(P',Q')$ 和反向不等式，故两值相等。因此任选产生曲线 $f$ 的一对分布，令 $\ell_D(f)$ 等于该对分布的 $D$ 值，定义不依赖代表元。若 $f\le g$，从实现 $f$ 的分布对到实现 $g$ 的分布对存在 kernel，再应用一次 data processing 即得单调性。 $\square$

这说明检验曲线同时控制所有满足 data processing 的分布差异：KL、TV 只是其中两个例子，任何一个这样的 $D$ 都是曲线的非增函数。因此不必为每个 $D$ 单独建立 unlearning 理论，$T(p,p_1)\le f_d$ 这一条就蕴含了全部。

## Proposition 8

运算 $f\otimes g=T(P\otimes P',Q\otimes Q')$ 不依赖于产生 $f=T(P,Q)$、$g=T(P',Q')$ 的具体分布对，并且满足交换律、结合律以及

$$
\begin{aligned}
f\otimes\mathrm{Id}&=f,\qquad \mathrm{Id}(u)=1-u,\\
(f\otimes g)^{-1}&=f^{-1}\otimes g^{-1},\\
g_1\ge g_2&\Longrightarrow f\otimes g_1\ge f\otimes g_2.
\end{aligned}
$$

若 $G_\mu=T(N(0,1),N(\mu,1))$，则

$$
G_{\mu_1}\otimes\cdots\otimes G_{\mu_n}
=G_{\sqrt{\sum\limits_{i=1}^{n}\mu_i^2}}.
$$

**证明。** 相同曲线的两组代表元可经 kernel 相互生成。将这些 kernel 与另一个坐标上的恒等 kernel 作乘积，就说明更换代表元后乘积曲线也可相互生成，因此曲线不变。交换坐标和改变坐标的分组方式都是可逆映射，分别证明交换律、结合律。

同分布对产生 $\mathrm{Id}$；添加这样的独立观察可以由随机生成完成，删去它则由投影完成，故它是单位元。取 generalized inverse 等价于同时交换两种假设，所以

$$
T(P\otimes P',Q\otimes Q')^{-1}
=T(Q\otimes Q',P\otimes P')=f^{-1}\otimes g^{-1}.
$$

若 $g_1\ge g_2$，实现 $g_2$ 的实验可以随机处理成实现 $g_1$ 的实验；对这一坐标做处理、对另一坐标不变，就证明乘积排序。最后，$n$ 个独立 Gaussian 实验的乘积为 $N(0,I_n)$ 与 $N((\mu_1,\ldots,\mu_n),I_n)$，Lemma 15 的距离公式给出平方和开根号。 $\square$

乘积运算的几何含义是"独立证据的叠加"：两个独立实验的 log-likelihood ratio 相加，等价的一维 Gaussian 距离按平方和复合。$n$ 个相同强度 $\mu$ 的实验合起来相当于强度 $\sqrt n\,\mu$，这是后面讨论多模态时 baseline 的尺度来源。

## Proposition 9

现在把分布可区分性与一个具体下游 loss 联系起来。设观察为 $(x,y)\in\mathcal X\times\mathcal Y$，$\mathcal Y$ 为有限或可数 label 空间，预测器 $h(x)$ 输出 label probability. 定义 log-loss

$$
L(h;p)=\mathbb E_{(x,y)\sim p}\big[-\log h(x)(y)\big].
$$

设预测器族包含真实的 label 条件分布，并取 $h(x)=p(\cdot\mid x)$、$h_1(x)=p_1(\cdot\mid x)$、$h_2(x)=q_1(\cdot\mid x)$；它们分别是在相应分布下最优的预测器，即 Bayes predictor. 这里 $p(\cdot\mid x)$ 表示 $p$ 的 label 条件分布，$p_X$ 表示 $p$ 在 $\mathcal X$ 上的边缘分布。假设涉及的 KL 与条件 entropy 有限，以保证以下差值有定义。若

$$
\operatorname{KL}(p_1\Vert p)\ge\alpha,\qquad
\operatorname{KL}(q_1\Vert p)\le\varepsilon,
$$

则

$$
L(h;p_1)-L(h_1;p_1)\ge\alpha-\delta_1,
\qquad
L(h;q_1)-L(h_2;q_1)\le\varepsilon-\delta_2,
$$

这里 $\delta_1=\operatorname{KL}(p_{1,X}\Vert p_X)$、$\delta_2=\operatorname{KL}(q_{1,X}\Vert p_X)$，下标 $X$ 表示输入边缘分布。论文在此也把 retained 分布记为 $p_2$，即 $p_2=q_1$.

**证明。** 对任意条件预测概率 $r(\cdot\mid x)$，相对于真实条件分布的 excess log-loss 是一个非负 KL，所以使用真实条件分布确实最优。具体到 $p_1$，

$$
\begin{aligned}
L(h;p_1)-L(h_1;p_1)
&=\mathbb E_{p_1}\!\left[\log\frac{p_1(y\mid x)}{p(y\mid x)}\right]\\
&=\mathbb E_{p_1}\!\left[\log\frac{dp_1}{dp}(x,y)-\log\frac{dp_{1,X}}{dp_X}(x)\right]\\
&=\operatorname{KL}(p_1\Vert p)-\delta_1\ge\alpha-\delta_1.
\end{aligned}
$$

第二个等号用到 $p_1(x,y)/p(x,y)=\big[p_{1,X}(x)/p_X(x)\big]\big[p_1(y\mid x)/p(y\mid x)\big]$；最后一个等号是两项各自的 KL. 将 $p_1$ 替换成 $q_1$，同一计算给出第二个不等式。 $\square$

结合 Proposition 1，我们可以令 $\alpha=\operatorname{KL}(Q_d\Vert P_d)$、$\varepsilon=\operatorname{KL}(Q_c\Vert P_c)$. 这个结论中的边缘 KL 不能省略：它度量两个分布在输入分布上的差异，如果分布差异完全来自输入频率变化而 label 条件分布没有变化，那么下游预测器并不需要因此改变，第一个不等式就会比 KL 的差值弱出 $\delta_1$。它的含义是：编辑后的分布 $p$ 上训练出的 Bayes predictor，在 unwanted 域上的表现至少差到某个程度，在 retained 域上的表现至多差到某个程度，于是 unlearning 的分布层面保证可以翻译成下游模型的行为保证。注意，在不包含 Bayes predictor 的受限模型族中，仅有"最小化了训练分布的 log-loss"不足以得到上述等式。

## Proposition 10

设 $p_1=\mu_1+X$、$q_1=\nu_1+X$，其中 $X$ 满足 Lemma 16 的对称 log-concave 条件（例如 Laplace 噪声），采用 $f_d=f_{X,\alpha}$、$f_c=f_{X,\varepsilon}$，即用这族噪声自身的平移对作 baseline，而不是 Gaussian 对。$\alpha,\varepsilon\ge0$.

若 $X$ 的支撑为 $\mathbb R$，可行均值集合为

$$
\begin{aligned}
\mathcal R
&=\{\mu\in\mathbb R:|\mu-\mu_1|\ge\alpha,\ |\mu-\nu_1|\le\varepsilon\}\\
&=[\nu_1-\varepsilon,\nu_1+\varepsilon]
\cap\left(({-\infty},\mu_1-\alpha]\cup[\mu_1+\alpha,\infty)\right).
\end{aligned}
$$

令 $\Delta=|\mu_1-\nu_1|$，则非空条件为 $\alpha\le\Delta+\varepsilon$，最大 removal 参数为 $\Delta+\varepsilon$.

**证明。** Lemma 16 给出

$$
T(\mu+X,\mu_1+X)=f_{X,|\mu-\mu_1|},\qquad
T(\mu+X,\nu_1+X)=f_{X,|\mu-\nu_1|}.
$$

完整支撑保证距离排序与曲线排序等价，因此得到两个绝对值约束。保留区间内距 $\mu_1$ 最远的端点具有距离 $\Delta+\varepsilon$，最小距离为 $\max\{\Delta-\varepsilon,0\}$；故非空性和 frontier 随之得到。 $\square$

与 Gaussian 情形相比，这里的可行域只由距离决定，形状与噪声的具体形式无关；噪声的形式只进入 $f_X$ 这一条曲线，而它是否单调由 Lemma 16 保证。注意，上述相交集合可以由两个区间组成。例如 $\mu_1=\nu_1=0$、$0<\alpha<\varepsilon$ 时，它等于 $[-\varepsilon,-\alpha]\cup[\alpha,\varepsilon]$. 因此原文将所有部分相交情形写成一个子区间并不成立。

对于 bounded support，设其闭包为 $[-a,a]$. 由 Lemma 16 的截断，准确的距离条件改为

$$
|\mu-\mu_1|\ge\min\{\alpha,2a\},
\qquad
\begin{cases}
|\mu-\nu_1|\le\varepsilon,&\varepsilon<2a,\\
\text{无额外约束},&\varepsilon\ge2a.
\end{cases}
$$

**证明。** 把 Lemma 16 中的截断距离排序分别代入 removal 与 preservation 即得。当 $\varepsilon<2a$ 时，非空条件为 $\min\{\alpha,2a\}\le\Delta+\varepsilon$；当 $\varepsilon\ge2a$ 时 $f_{X,\varepsilon}\equiv0$，preservation 约束 $T(p,q_1)\ge0$ 自动成立，因为 trade-off function 本身非负，于是可行集由 removal 的截断条件单独决定，即 $|\mu-\mu_1|\ge\min\{\alpha,2a\}$. $\square$

因此若 $\varepsilon<2a$ 且 $\Delta+\varepsilon<2a$，最大 $\alpha$ 仍为 $\Delta+\varepsilon$；达到完全分离后，任意更大的 $\alpha$ 都代表同一条 baseline，不能再把 $\alpha$ 的数值增长当作更强的 removal. 当 $\varepsilon\ge2a$ 时 preservation 一侧没有信息，可行域只剩 removal 的截断条件。原文的 Proposition 10 直接援引 Lemma 16 的距离排序等价性，因此上述截断只在完整支撑时与原文一致；有界支撑时若沿用未截断的条件，会错误地用 $\alpha$ 的数值增长当作更强的 removal.

## Proposition 11

对 $k$ 个 unwanted 分布与 $l$ 个 retained 分布，我们要求每个约束同时成立：

$$
T(p,p_i)\le f_{di}\quad(1\le i\le k),\qquad
T(p,q_j)\ge f_{cj}\quad(1\le j\le l).
$$

这里 $p_i$ 与 $q_j$ 分别是第 $i$ 个 unwanted 域与第 $j$ 个 retained 域的分布，$f_{di}$、$f_{cj}$ 是对应的 baselines. 这一推广对应实际中同时要遗忘多个域、同时要保持多个域的情形。设 $p_i=N(\mu_i,\Sigma)$、$q_j=N(\nu_j,\Sigma)$，$\Sigma\succ0$，baselines 为 $f_{di}=f_{G,\alpha_i}$、$f_{cj}=f_{G,\varepsilon_j}$. 则

$$
\mathcal R=
\left\{N(\mu,\Sigma):
\left\|\Sigma^{-1/2}(\mu-\mu_i)\right\|_2\ge\alpha_i\ \forall i,
\ \left\|\Sigma^{-1/2}(\mu-\nu_j)\right\|_2\le\varepsilon_j\ \forall j
\right\}.
$$

**证明。** 对每一对 $(p,p_i)$ 和 $(p,q_j)$ 应用 Proposition 3，再取所有约束的交集即可。在 $\Sigma=I_d$ 时，这等于所有 retained 闭球的交集，减去所有 unwanted 开球的并集。 $\square$

对于 $d=1$、$\Sigma=1$，准确公式是

$$
\mathcal R=
\left[\max_{1\le j\le l}(\nu_j-\varepsilon_j),\ \min_{1\le j\le l}(\nu_j+\varepsilon_j)\right]
\setminus\bigcup\limits_{i=1}^{k}(\mu_i-\alpha_i,\mu_i+\alpha_i).
$$

这个集合为空，当且仅当 retained 区间本身为空，或整个 retained 区间被该开区间并集覆盖。

注意，原文把这个并集替换成从最左端点到最右端点的一个大开区间，会删掉本来可行的间隙。例如 $\mu_1=-2,\mu_2=2,\alpha_1=\alpha_2=1$，retained 约束为 $[-1/2,1/2]$ 时，整个 retained 区间都可行，但该替换会错误地判为空。在多维情形下，可行域是若干球体的交减去若干开球的并，判断它是否非空本身就是计算困难的问题，原文在 Remark 25 中指出这一点。

## Proposition 12

设 $p_i=\mu_i+X$、$q_j=\nu_j+X$，$X$ 具有共同的 symmetric log-concave density，先假设其支撑为 $\mathbb R$. $\mu_i,\nu_j\in\mathbb R$ 是各域的中心。对 baselines $f_{di}=f_{X,\alpha_i}$、$f_{cj}=f_{X,\varepsilon_j}$，可行中心为

$$
\mathcal R=
\left[\max_{1\le j\le l}(\nu_j-\varepsilon_j),\ \min_{1\le j\le l}(\nu_j+\varepsilon_j)\right]
\setminus\bigcup\limits_{i=1}^{k}(\mu_i-\alpha_i,\mu_i+\alpha_i).
$$

**证明。** Lemma 16 将每个约束分别转成 $|\mu-\mu_i|\ge\alpha_i$、$|\mu-\nu_j|\le\varepsilon_j$. 后一组取交集得到显示的闭区间，前一组排除各个开区间，故得到公式。 $\square$

若支撑闭包为 $[-a,a]$，则把每个删除半径替换成 $\min\{\alpha_i,2a\}$，并只对满足 $\varepsilon_j<2a$ 的 retained 约束取交集；没有此类约束时，保留区间为整个 $\mathbb R$. 这是 Proposition 10 的截断距离条件逐项取交集的直接结果。

## Lemma 26

设 $H$ 为实可分 Hilbert 空间，$K:H\to H$ 为非负、自伴、trace-class operator. 这三个条件分别保证 covariance 非负、对称，以及 Gaussian 随机元素具有有限的平均平方范数，即 $P_0=N(0,K)$ 是 $H$ 上的概率测度。取 eigenbasis $\{e_j\}_{j\ge1}$，令 $Ke_j=\lambda_j e_j$，则 $\lambda_j\ge0$、$\sum\limits_{j\ge1}\lambda_j<\infty$.

Cameron–Martin space 定义为

$$
\begin{aligned}
H_K=\operatorname{Range}(K^{1/2})
=\left\{h=\sum\limits_{j=1}^{\infty}h_j e_j:
\sum\limits_{j:\lambda_j>0}\frac{h_j^2}{\lambda_j}<\infty,
\ h_j=0\text{ 当 }\lambda_j=0\right\},\\
\langle h,h'\rangle_{H_K}
=\sum\limits_{j:\lambda_j>0}\frac{h_jh_j'}{\lambda_j},\qquad
\|h\|_{H_K}=\|K^{-1/2}h\|_H.
\end{aligned}
$$

这里 $h_j=\langle h,e_j\rangle_H$；$K^{-1/2}h$ 指位于 $(\ker K)^\perp$ 中的唯一 preimage. $H_K$ 是使平移后测度 $N(h,K)$ 与 $P_0$ 等价的那些 $h$ 组成的空间：$\|h\|_{H_K}$ 把低噪声方向的位移赋予更大的统计距离，$\lambda_j$ 小的坐标上同样的位移更难被噪声掩盖。若 $h\notin H_K$，$N(h,K)$ 与 $P_0$ 相互奇异（Gaussian 平移的二分性），这时 trade-off function 恒为 $0$，没有讨论价值，因此候选族只含 $H_K$ 中的平移。

令 $P_h=N(h,K)$，$h\in H_K$. 则对 $h,h'\in H_K$，

$$
T(P_h,P_{h'})=T(N(0,1),N(\Delta,1)),\qquad
\Delta^2=\|h'-h\|_{H_K}^2.
$$

**证明。** 令 $v=h'-h\in H_K$. 对每个正 eigenvalue 的坐标，在 $P_h$ 下，$\langle X-h,e_j\rangle_H/\sqrt{\lambda_j}$ 是独立标准 Gaussian. 前 $m$ 个有效坐标的 log-likelihood ratio 是

$$
\sum\limits_{\substack{1\le j\le m\\\lambda_j>0}}
\frac{v_j}{\lambda_j}\langle X-h,e_j\rangle_H
-\frac12\sum\limits_{\substack{1\le j\le m\\\lambda_j>0}}\frac{v_j^2}{\lambda_j}.
$$

由于 $v\in H_K$，随机和的方差收敛到 $\|v\|_{H_K}^2$，所以随机和在 $L^2(P_h)$ 中收敛。和 Proposition 4 相同，likelihood ratios 的二阶矩有统一上界 $\exp(\|v\|_{H_K}^2)$，故极限给出整个 Gaussian measure 的 likelihood ratio. 因而

$$
\log\frac{dP_{h'}}{dP_h}
\sim
\begin{cases}
N(-\Delta^2/2,\Delta^2),&P_h,\\
N(\Delta^2/2,\Delta^2),&P_{h'},
\end{cases}
$$

即 likelihood ratio 在两种假设下只差一个符号的均值。Likelihood-ratio test 将整个无限维实验归结为这个一维 Gaussian 实验，得到结论。 $\square$

证明的思路与 Proposition 4 完全一致：无限维观察的信息全部集中在一个方向 $v$ 上，其余坐标在两种假设下同分布，被噪声淹没。区别只在于坐标的噪声尺度是 $\lambda_j$ 而不是 $1$，于是 $\ell^2$ 距离换成了 Cameron–Martin 范数。

注意，一般只有 $\overline{\operatorname{Range}(K^{1/2})}=(\ker K)^\perp$，不能像原文一样去掉闭包。并且 $K^{-1}v$ 或 $K^{-1/2}X$ 未必是 $H$ 中的元素；上面的收敛随机级数才是 likelihood 中相应线性项的严格含义。

## Proposition 13

在 Lemma 26 的条件下，进一步假设 $H_K\ne\{0\}$. 设 $p_1=N(\mu_1,K)$、$q_1=N(\nu_1,K)$，$\mu_1,\nu_1\in H_K$，候选族为 $\mathcal P=\{N(\mu,K):\mu\in H_K\}$. 对 Gaussian baselines $f_d=T(N(0,1),N(\alpha,1))$、$f_c=T(N(0,1),N(\varepsilon,1))$，

$$
\mathcal R=
\left\{N(\mu,K):\|\mu-\mu_1\|_{H_K}\ge\alpha,
\ \|\mu-\nu_1\|_{H_K}\le\varepsilon\right\}.
$$

令 $\Delta=\|\mu_1-\nu_1\|_{H_K}$，则可行域非空当且仅当 $\alpha\le\Delta+\varepsilon$，frontier 为 $\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\}$.

**证明。** Lemma 26 把每一对 Gaussian 测度的曲线写成距离参数的一维 Gaussian 曲线，Lemma 15 的严格排序把它转成 Cameron–Martin 距离约束。对任意可行中心，$\|\mu-\mu_1\|_{H_K}\le\Delta+\varepsilon$. 当 $\Delta>0$ 时，取

$$
\mu=\nu_1+\frac{\varepsilon}{\Delta}(\nu_1-\mu_1)
$$

达到等号；当 $\Delta=0$ 时，$H_K\ne\{0\}$ 允许选择一个单位方向 $u\in H_K$，取 $\mu=\nu_1+\varepsilon u$ 即可。 $\square$

与有限维情形相同，整个 preservation 球都可行的条件是 $\alpha\le\max\{\Delta-\varepsilon,0\}$. 若 $K=0$，则 $H_K=\{0\}$，候选族只有同一个点质量分布，只有 $\alpha=0$ 可行；这时不具有上述可以沿任意方向移动的 frontier. 有限维的 Proposition 3 是这一结果的特例：取 $H=\mathbb R^d$、$K=\Sigma$，Cameron–Martin 范数就是 $\left\|\Sigma^{-1/2}\cdot\right\|_2$.

## Lemma 28

对 $a,b,c,d>0$，以下三个条件等价：

$$
\begin{gathered}
T(P(a),P(b))\le T(P(c),P(d));\\
\exists s\in[0,1],\ r\ge0:\ c=sa+r,\ d=sb+r;\\
(a,b)\text{ 与 }(c,d)\text{ 同序},\quad
|c-d|\le|a-b|,\quad
\frac{\max\{a,b\}}{\min\{a,b\}}
\ge\frac{\max\{c,d\}}{\min\{c,d\}}.
\end{gathered}
$$

这里同序指 $a\le b,c\le d$ 同时成立，或 $a\ge b,c\ge d$ 同时成立。$P(\cdot)$ 是 Poisson 分布。

**证明。** 若存在 $s,r$，Proposition 5 的 thinning 与 Poisson addition 就构造出所需 kernel：先以 $s$ 做 thinning（两个均值同时乘以 $s$，比值不变），再加入 $P(r)$ 噪声（两个均值同时加 $r$，差值不变）。这就是 $c=sa+r$、$d=sb+r$ 的几何含义，也说明了为什么刻画只需要两个不变量：差值与比值。于是得到曲线排序。同时，$|c-d|=s|a-b|\le|a-b|$；加上共同的非负数 $r$ 会使大数与小数之比向 $1$ 靠近，所以也得到比值条件。

反过来，先设 $a<b$、$c<d$. 若差值与比值条件成立，令

$$
s=\frac{d-c}{b-a},\qquad
r=c-sa=\frac{bc-ad}{b-a}.
$$

差值条件保证 $0\le s\le1$，比值条件 $b/a\ge d/c$ 保证 $r\ge0$. 当两对都降序时同时交换各对的两个坐标，计算完全相同。若 $c=d$，可直接取 $s=0,r=c$；若 $a=b$，条件强制 $c=d$. 因而最后两个条件组等价。

剩下要证明曲线排序蕴含这些数值条件。设 $a\ne b$、$c\ne d$. Lemma 29 给出曲线在两个端点附近的斜率：升序 Poisson 实验具有有限的右端斜率、无限的左端斜率；降序实验则相反。若两对逆序，两个端点中总有一个违反所需的曲线排序，因此两对必须同序。对同为升序的情形，右端斜率比较给出

$$
e^{-(b-a)}\le e^{-(d-c)}\quad\Longrightarrow\quad d-c\le b-a.
$$

同为降序时，左端斜率比较给出 $e^{a-b}\ge e^{c-d}$，即相同的绝对差条件。

为证明比值条件，我们用 Hellinger transform

$$
H_t(P,Q)=\mathbb E_P\!\left[\left(\frac{dQ}{dP}\right)^t\right],
$$

它是 likelihood ratio 的 $t$ 阶矩。Poisson 情形直接计算为

$$
\begin{aligned}
H_t(P(a),P(b))
&=\sum\limits_{k=0}^{\infty}\frac{e^{-a}a^k}{k!}
\left(e^{a-b}\left(\frac ba\right)^k\right)^t\\
&=\exp\!\left(-(1-t)a-tb+a\left(\frac ba\right)^t\right).
\end{aligned}
$$

根据 Blackwell ordering 和 Lemma 31，$t>1$ 时输入实验的 $H_t$ 不小于输出实验的 $H_t$. 因而

$$
(t-1)(a-c)-t(b-d)
+a\left(\frac ba\right)^t-c\left(\frac dc\right)^t\ge0.
$$

若 $a<b,c<d$ 但 $b/a<d/c$，令 $t\to+\infty$，负的最后一项 $-c(d/c)^t$ 比正的 $a(b/a)^t$ 增长更快，也快于线性项，使左侧趋于 $-\infty$，矛盾。若 $a>b,c>d$ 但 $a/b<c/d$，令 $t\to-\infty$ 得到同样的矛盾。因此比值条件成立，证明完成。 $\square$

由这一刻画，Proposition 5 的其余 baseline 参数范围也能直接解出。removal 与 preservation 各自给出一个单侧界或区间，两者相交即得可行均值。四种参数组合如下，每个区间都与 $(0,\infty)$ 相交，左端点超过右端点时为空：

- $\alpha>1,\ \varepsilon>1$ 时，
$$
\mathcal R_P=\left[\max\left\{\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\},\ \min\left\{\nu_1,\frac{\mu_1}{\alpha},\mu_1+1-\alpha\right\}\right];
$$

- $\alpha>1,\ 0<\varepsilon<1$ 时，
$$
\mathcal R_P=\left[\nu_1,\ \min\left\{\frac{\mu_1}{\alpha},\mu_1+1-\alpha,\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\}\right];
$$

- $0<\alpha<1,\ \varepsilon>1$ 时，
$$
\mathcal R_P=\left[\max\left\{\frac{\mu_1}{\alpha},\mu_1+1-\alpha,\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\},\ \nu_1\right];
$$

- $0<\alpha<1,\ 0<\varepsilon<1$ 时，
$$
\mathcal R_P=\left[\max\left\{\frac{\mu_1}{\alpha},\mu_1+1-\alpha,\nu_1\right\},\ \min\left\{\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\}\right].
$$

**推导。** 对 $\alpha>1$，removal 要求 $\mu\le\min\{\mu_1/\alpha,\mu_1+1-\alpha\}$；对 $\alpha<1$，同样解 $s_1=(\alpha-1)/(\mu_1-\mu)$，得到 $\mu\ge\max\{\mu_1/\alpha,\mu_1+1-\alpha\}$. Preservation 在 $\varepsilon>1$ 时给出

$$
\max\left\{\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\}\le\mu\le\nu_1,
$$

在 $\varepsilon<1$ 时给出

$$
\nu_1\le\mu\le\min\left\{\frac{\nu_1}{\varepsilon},\nu_1+1-\varepsilon\right\}.
$$

分别相交就得到四行。 $\square$

若记 $L_\varepsilon=\max\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\}$、$U_\varepsilon=\min\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\}$，则固定 $\varepsilon$ 时允许的 $\alpha$ 为

$$
\begin{cases}
\left[\max\left\{\dfrac{\mu_1}{\nu_1},\mu_1+1-\nu_1\right\},1\right)
\ \cup\ \{1\}\ \cup\
\left(1,\min\left\{\dfrac{\mu_1}{L_\varepsilon},\mu_1+1-L_\varepsilon\right\}\right],&\varepsilon>1,\\[6pt]
\left[\max\left\{\dfrac{\mu_1}{U_\varepsilon},\mu_1+1-U_\varepsilon\right\},1\right)
\ \cup\ \{1\}\ \cup\
\left(1,\min\left\{\dfrac{\mu_1}{\nu_1},\mu_1+1-\nu_1\right\}\right],&0<\varepsilon<1.
\end{cases}
$$

这些表达式来自相应区间的左端点不大于右端点。这里 $\alpha=1$ 时 removal baseline 为 $1-u$，约束恒成立；$\varepsilon=1$ 时 preservation 强制 $\mu=\nu_1$，只需把这个均值代入 removal 条件。注意，上式是全部可行参数，并非其中每一点都是 Pareto 最优点。

## Lemma 29

令 $f(u)=T(P(a),P(b))(u)$，$a,b>0$ 且 $a\ne b$. 则

$$
\lim_{u\uparrow1}\frac{f(u)}{1-u}
=\begin{cases}e^{-(b-a)},&a<b,\\0,&a>b,\end{cases}
\qquad
\lim_{u\downarrow0}\frac{1-f(u)}u
=\begin{cases}+\infty,&a<b,\\e^{a-b},&a>b.\end{cases}
$$

也就是说，曲线在两个端点附近的斜率分别是 likelihood ratio 在 $P$ 下的 essential infimum 与 essential supremum.

**证明。** 先说明一般 likelihood ratio $L=dQ/dP$ 如何决定端点。对于 type I error 至多 $u$ 的检验，$\mathbb E_P[L\phi]\le u\,\operatorname*{ess\,sup}_P L$，所以最优 power 与 $u$ 的比值不超过该 essential supremum. 另一方面，对任何小于该上确界的数 $c$，集合 $\{L>c\}$ 具有正 $P$ 概率。在这个集合中以适当概率拒绝，可以在所有足够小的 $u$ 下达到 power 至少 $cu$. 令 $u\downarrow0$，再令 $c$ 趋向 essential supremum，就得到

$$
\lim_{u\downarrow0}\frac{1-T(P,Q)(u)}u=\operatorname*{ess\,sup}_P L.
$$

同理，在 $u$ 接近 $1$ 时，最优检验把剩余的接受概率放在 likelihood ratio 最小的位置。接受概率至少为 $1-u$，其 $Q$ 概率至少为 $(1-u)\operatorname*{ess\,inf}_P L$；在 $\{L<c\}$ 内随机接受又给出反向逼近，因此

$$
\lim_{u\uparrow1}\frac{T(P,Q)(u)}{1-u}=\operatorname*{ess\,inf}_P L.
$$

Poisson 的 likelihood ratio 是

$$
L(k)=e^{a-b}\left(\frac ba\right)^k,\qquad k=0,1,2,\ldots.
$$

当 $a<b$，它从 $e^{a-b}$ 严格递增到无穷；当 $a>b$，它从 $e^{a-b}$ 严格递减到 $0$. 每个整数都有正概率，故普通上下确界就是 essential 上下确界，代入即得结论。 $\square$

## Lemma 31

设 $Q\ll P$，$R$ 是 Markov kernel. 定义 $H_t(P,Q)=\mathbb E_P\left[\left(\dfrac{dQ}{dP}\right)^t\right]$，允许其取 $+\infty$，并在 $t=0$ 取 $H_0=1$. 则

$$
\begin{aligned}
H_t(P,Q)&\le H_t(R\circ P,R\circ Q),&&0\le t\le1,\\
H_t(P,Q)&\ge H_t(R\circ P,R\circ Q),&&t<0\text{ 或 }t>1.
\end{aligned}
$$

**证明。** 在 $X\sim P$、$Y\mid X\sim R(X,\cdot)$ 的联合分布下，令 $L(X)=dQ/dP(X)$. 对任意输出集合 $A$，

$$
(R\circ Q)(A)=\mathbb E_P[L(X)\mathbf 1_{\{Y\in A\}}]
=\mathbb E_P\big[\mathbb E[L(X)\mid Y]\mathbf 1_{\{Y\in A\}}\big],
$$

因此输出的 likelihood ratio 就是 $\mathbb E[L\mid Y]$，且 $R\circ P$ 下的期望就是 $P$ 下的期望。对 $0<t<1$，$x^t$ 为凹函数，条件 Jensen 给出

$$
H_t(R\circ P,R\circ Q)
=\mathbb E\big[(\mathbb E[L\mid Y])^t\big]
\ge\mathbb E[L^t]=H_t(P,Q).
$$

当 $t<0$ 或 $t>1$ 时，$x^t$ 为凸函数，不等号反向；零值导致的无穷按扩展实数处理。$t=0,1$ 时两侧均为 $1$. $\square$

注意，$0\le t\le1$ 时的方向与 $t>1$ 时相反，这不是笔误：$t$ 在 $(0,1)$ 时 $H_t$ 关于两个分布对称且起类似"重叠度"的作用，随机处理只会让它变大；$t$ 在区间外时它衡量的是尾部，随机处理只会让它变小。Lemma 28 的比值条件用的正是 $t>1$ 那一侧。

## Lemma 34

令 $B(n,p)$ 表示 $n\ge1$ 次独立 Bernoulli trials 的成功次数分布。设 unwanted 与 retained 分布为 $B(n,\mu_1)$、$B(n,\nu_1)$，其中 $\mu_1,\nu_1\in(0,1)$，采用

$$
f_d^n=T(B(n,1/2),B(n,\alpha)),\qquad
f_c^n=T(B(n,1/2),B(n,\varepsilon)),\qquad\alpha,\varepsilon\in(0,1).
$$

候选均值参数 $p\in(0,1)$ 的准确可行条件是

$$
\begin{aligned}
\min\left\{\frac{\mu_1}{p},\frac{1-\mu_1}{1-p}\right\}
&\le2\min\{\alpha,1-\alpha\},\\
\max\left\{\frac{\mu_1}{p},\frac{1-\mu_1}{1-p}\right\}
&\ge2\max\{\alpha,1-\alpha\},\\
\min\left\{\frac{\nu_1}{p},\frac{1-\nu_1}{1-p}\right\}
&\ge2\min\{\varepsilon,1-\varepsilon\},\\
\max\left\{\frac{\nu_1}{p},\frac{1-\nu_1}{1-p}\right\}
&\le2\max\{\varepsilon,1-\varepsilon\}.
\end{aligned}
$$

**证明。** Lemma 35 将相同 $n$ 的 Binomial 实验排序化为 Bernoulli likelihood ratio 的最小值与最大值排序。在 removal 中，输入实验是 $(B(n,p),B(n,\mu_1))$，目标实验是 baseline；代入 $a=p,b=\mu_1,c=1/2,d=\alpha$ 并注意 $2\min\{1/2,\alpha\}$ 之类的因子，得到前两式。在 preservation 中交换实验的方向，代入 $a=1/2,b=\varepsilon,c=p,d=\nu_1$ 得到后两式。 $\square$

注意，原文在刻画中额外要求参数对同序，这在 Binomial 情形并不必要：把观察到的成功次数 $X$ 换成 $n-X$ 是可逆处理，它把参数 $(a,b)$ 变成 $(1-a,1-b)$ 并反转大小关系，而 trade-off function 完全不变。于是任何一对 $(a,b)$ 都能换成逆序的等价对，同序要求就会把本来可行的组合排除掉。上面的四条 min/max 不等式不依赖同序，才是完整的条件。

## Lemma 35

对 $a,b,c,d\in(0,1)$ 和任意固定整数 $n\ge1$，以下三个条件等价：

$$
\begin{gathered}
T(B(n,a),B(n,b))\le T(B(n,c),B(n,d));\\
T(B(1,a),B(1,b))\le T(B(1,c),B(1,d));\\
\min\left\{\frac ba,\frac{1-b}{1-a}\right\}
\le\min\left\{\frac dc,\frac{1-d}{1-c}\right\},\qquad
\max\left\{\frac ba,\frac{1-b}{1-a}\right\}
\ge\max\left\{\frac dc,\frac{1-d}{1-c}\right\}.
\end{gathered}
$$

**证明。** Bernoulli 只有两个 likelihood ratio：观察到 $1$ 时为 $b/a$，观察到 $0$ 时为 $(1-b)/(1-a)$. Lemma 36 的两段式可合并为

$$
T(B(1,a),B(1,b))(u)
=\max\left\{
1-u\max\left\{\frac ba,\frac{1-b}{1-a}\right\},
(1-u)\min\left\{\frac ba,\frac{1-b}{1-a}\right\}
\right\}.
$$

所述两条数值不等式使右侧两条直线都不高于目标实验对应的直线，故足以推出曲线排序。必要性则来自 Lemma 29 证明中的一般端点公式：比较左端 power 斜率与右端 type II error 斜率即可。

若 Bernoulli 曲线有序，Proposition 8 保证其 $n$ 重乘积也有序。$n$ 个 Bernoulli observations 与它们的成功次数包含同样的实验信息：从 observations 到成功次数只需求和；给定次数 $k$ 后，在所有含 $k$ 个 $1$ 的长度 $n$ 序列中均匀抽样，即可恢复原向量。这个条件分布不依赖成功概率。因此 Bernoulli product 与 Binomial experiment 的 trade-off function 相同，证明了从第二项到第一项。

最后，Binomial likelihood ratio 为

$$
\frac{B(n,b)\{k\}}{B(n,a)\{k\}}
=\left(\frac ba\right)^k
\left(\frac{1-b}{1-a}\right)^{n-k}.
$$

它的最小值是两个 Bernoulli ratios 中较小者的 $n$ 次方，最大值是较大者的 $n$ 次方。若 Binomial 曲线有序，端点比较给出这些 $n$ 次方的排序，取正的 $n$ 次根就得到第三项。 $\square$

也可以直接看 kernel 的几何意义：令 $r_0=\mathbb P(Y=1\mid X=0)$、$r_1=\mathbb P(Y=1\mid X=1)$，则

$$
(c,d)=r_0(1-a,1-b)+r_1(a,b),\qquad 0\le r_0,r_1\le1.
$$

所以能得到的 $(c,d)$ 构成顶点为 $(0,0),(1,1),(a,b),(1-a,1-b)$ 的 parallelogram；原文的三角形只覆盖其中一个方向。

## Lemma 36

对 $a,b\in(0,1)$，Bernoulli trade-off function 为

$$
T(B(1,a),B(1,b))(u)=
\begin{cases}
1-\dfrac ba u,&b>a,\ 0\le u\le a,\\[3pt]
\dfrac{1-b}{1-a}(1-u),&b>a,\ a\le u\le1,\\[3pt]
1-\dfrac{1-b}{1-a}u,&b<a,\ 0\le u\le1-a,\\[3pt]
\dfrac ba(1-u),&b<a,\ 1-a\le u\le1,\\[3pt]
1-u,&b=a.
\end{cases}
$$

**证明。** 当 $b>a$ 时，观察值 $1$ 的 likelihood ratio 较大。若误报预算 $u\le a$，只在观察到 $1$ 时以概率 $u/a$ 拒绝，power 为 $bu/a$，故 type II error 为 $1-bu/a$. 若 $u\ge a$，在观察到 $1$ 时总拒绝，并在观察到 $0$ 时以概率 $(u-a)/(1-a)$ 拒绝，故

$$
\begin{aligned}
T(B(1,a),B(1,b))(u)
&=1-b-(1-b)\frac{u-a}{1-a}\\
&=\frac{1-b}{1-a}(1-u).
\end{aligned}
$$

当 $b<a$，likelihood ratio 较大的是观察值 $0$. 按同样方法先对 $0$ 分配预算：在 $u\le1-a$ 时拒绝概率为 $u/(1-a)$；超过这个预算后总拒绝 $0$，再对 $1$ 随机拒绝，分别得到第三、第四行。当 $a=b$ 时两分布相同，拒绝概率在两个假设下相同，故曲线为 $1-u$. Neyman–Pearson 原理保证这些预算分配最优。 $\square$

## Lemma 37

设 $X_1,\ldots,X_n$ 独立服从 $N(\mu,\sigma^2I_d)$，$\hat\mu=n^{-1}\sum\limits_{i=1}^{n}X_i$. 则对 $0<\delta<1$，

$$
\mathbb P\!\left(\|\hat\mu-\mu\|_2>\sigma\gamma(n,d,\delta)\right)\le\delta.
$$

这里 $\gamma$ 就是 Proposition 6 中定义的函数：单次使用时失败概率是 $\delta$，所以那里要对两次估计各取 $\gamma(\cdot,\cdot,\delta/2)$，union bound 之后合计 $\delta$. 论文原文把它写成 $\gamma(n,d,2\delta)$ 配 $\delta$，是同一个约定的另一种写法。

**证明。** $\sqrt n(\hat\mu-\mu)/\sigma$ 为标准 $d$ 维 Gaussian，因此 $n\|\hat\mu-\mu\|_2^2/\sigma^2$ 具有 $\chi_d^2$ 分布，即 $\sum\limits_{j=1}^{d}Z_j^2$ 与 $d$ 个独立标准 Gaussian 的平方和同分布。下面推导所需的 Laurent–Massart 界。

令 $Z_1,\ldots,Z_d$ 独立服从 $N(0,1)$，并设 $S=\sum\limits_{j=1}^{d}Z_j^2-d$. 对 $0<\lambda<1/2$，Gaussian 积分给出

$$
\begin{aligned}
\log\mathbb E[e^{\lambda S}]
&=\frac d2\left(-\log(1-2\lambda)-2\lambda\right)\\
&=\frac d2\sum\limits_{k=2}^{\infty}\frac{(2\lambda)^k}{k}
\le\frac{d\lambda^2}{1-2\lambda},
\end{aligned}
$$

最后一步用到 $\sum\limits_{k\ge2}\dfrac{x^k}{k}\le\dfrac{x^2}{2(1-x)}$ 取 $x=2\lambda$. 对于 $t>0$，在 Chernoff bound 中取 $\lambda=\dfrac{\sqrt t}{\sqrt d+2\sqrt t}$，这个取法保证 $\lambda<1/2$ 并使指数恰好配成 $-t$，得到

$$
\begin{aligned}
\mathbb P\!\left(S\ge2\sqrt{dt}+2t\right)
&\le\exp\!\left(
-\lambda(2\sqrt{dt}+2t)+\frac{d\lambda^2}{1-2\lambda}
\right)\\
&=e^{-t}.
\end{aligned}
$$

取 $t=\log(1/\delta)$，则 $e^{-t}=\delta$. 由于

$$
\frac{n\|\hat\mu-\mu\|_2^2}{\sigma^2}=d+S
\ge d+2\sqrt{dt}+2t
=n\gamma(n,d,\delta)^2,
$$

恢复均值的尺度并开平方，即得结论。 $\square$

这个引理是后面所有有限样本结论的起点：每次用样本均值估计中心，误差以 $\sigma\gamma$ 的高概率尺度出现，维数 $d$ 只通过 $\sqrt d$ 进入。Remark 38 与 Remark 39 会把它同时用于两个中心估计，再借三角不等式把估计误差转成两个中心之间距离的两侧控制，这是 Remark 40 判断随机删除在什么参数处失败的依据。

## Proposition 14

下一节把 random removal 从 Gaussian 推广到一般的 location family。设 $p_1=\mu_1+X$、$q_1=\nu_1+X$，其中 $d=1$，$X$ 关于 $0$ 对称且具有 log-concave density，例如 Laplace 噪声。$\mathcal P=\{\mu+X:\mu\in\mathbb R\}$. 两组样本分别含 $n_1,n_2$ 个 IID observations，两组相互独立；从第一组独立于数据值均匀删除 $n_r$ 个，令 $n_1'=n_1-n_r\ge1$，然后用两组剩余样本的加权 empirical mean 拟合 $p=\mu+X$：

$$
\mu=\frac{n_1'\hat\mu_1'+n_2\hat\nu_1}{n_1'+n_2},\qquad
\Delta=|\mu_1-\nu_1|.
$$

注意这里拟合的不是 MLE：对一般的 log-concave location family，均值不是 MLE，例如 Laplace 的 MLE 是 median. 用均值而不用 MLE，是因为均值的误差可以直接分解成两个中心估计误差与一个残余权重，证明结构与 Gaussian 情形逐字相同；这是为可分析性做的选择。

设 $\gamma_X(n,1,\delta)$ 满足

$$
\mathbb P\!\left(\left|\frac1n\sum\limits_{i=1}^{n}X_i\right|>\gamma_X(n,1,\delta)\right)\le\frac\delta2,
\qquad X_i\overset{\mathrm{IID}}\sim X.
$$

这里 $\gamma_X$ 是噪声均值的 concentration scale，与 $\gamma(n,d,\delta)$ 扮演同一个角色，只是不再有 Gaussian 的显式公式，需要针对每个噪声族单独给出。取失败概率 $\delta/2$ 的约定与前面一致，两次使用合计 $\delta$. 令

$$
\begin{aligned}
\varepsilon_m(R)
&=\frac{n_1'\Delta}{n_1'+n_2}
+\frac{n_1'\gamma_X(n_1',1,\delta)+n_2\gamma_X(n_2,1,\delta)}{n_1'+n_2},\\
\alpha_M(R)&=\Delta-\varepsilon_m(R).
\end{aligned}
$$

则以至少 $1-\delta$ 的概率，$0\le\alpha\le\alpha_M(R)$、$\varepsilon\ge\varepsilon_m(R)$ 保证相对于 $f_d=T(X,\alpha+X)$、$f_c=T(X,\varepsilon+X)$ 的 unlearning.

**证明。** $X$ 对称且 log-concave，因而其均值存在并等于 $0$. 两次均值 concentration 与 union bound 给出

$$
|\hat\mu_1'-\mu_1|\le\gamma_X(n_1',1,\delta),\qquad
|\hat\nu_1-\nu_1|\le\gamma_X(n_2,1,\delta)
$$

同时成立的事件，概率至少为 $1-\delta$. 在该事件上，

$$
\begin{aligned}
|\mu-\nu_1|
&\le\frac{n_1'}{n_1'+n_2}|\mu_1-\nu_1|
+\frac{n_1'}{n_1'+n_2}|\hat\mu_1'-\mu_1|
+\frac{n_2}{n_1'+n_2}|\hat\nu_1-\nu_1|\\
&\le\varepsilon_m(R),\\
|\mu-\mu_1|&\ge\Delta-|\mu-\nu_1|\ge\alpha_M(R).
\end{aligned}
$$

Lemma 16 的单向单调性已经足以将这两个距离界变成检验约束：这里只需要"距离越大曲线越低"，不需要反向，因此不需要假设 $X$ 具有 full support. $\square$

与 Proposition 6 相比，结论的形状完全相同，只是把 $\sigma\gamma(n,d,\cdot)$ 换成了 $\gamma_X(n,1,\cdot)$. 这说明 Gaussian 结论中的常数结构并不依赖 Gaussian，维数只通过 $\gamma$ 进入。

论文给出的几类 noise 可以选取以下界（$n\gamma_X(n,1,\delta)$ 的值）：

- $X\sim N(0,1)$ 时，$n\gamma_X(n,1,\delta)=\sqrt n\,\Phi^{-1}(1-\delta/4)$；
- $X\sim\operatorname{Unif}[-a,a]$ 时，$n\gamma_X(n,1,\delta)=a\sqrt{2n\log(4/\delta)}$；
- 任意支撑于 $[-a,a]$ 的对称 noise，$n\gamma_X(n,1,\delta)=a\sqrt{2n\log(4/\delta)}$；
- density 为 $\frac12e^{-|x|}$ 的 Laplace noise，$n\gamma_X(n,1,\delta)=2\sqrt{n\log(4/\delta)}+\log(4/\delta)$.

**推导。** Gaussian 样本均值服从 $N(0,1/n)$，其双侧尾概率直接给出第一行。对有界 noise，Hoeffding bound 给出

$$
\mathbb P\!\left(\left|\frac1n\sum\limits_{i=1}^{n}X_i\right|>r\right)
\le2\exp\!\left(-\frac{nr^2}{2a^2}\right).
$$

这个界可以由 $\log\mathbb E[e^{\lambda X_i}]\le\lambda^2a^2/2$、独立性与 Chernoff optimization 得到。为说明指数矩界，令 $\psi(\lambda)=\log\mathbb E[e^{\lambda X_i}]$. 它的二阶导数是按 $e^{\lambda X_i}$ 加权后的分布方差；这个分布仍支撑于 $[-a,a]$，所以方差不超过 $a^2$. 结合 $\psi(0)=\psi'(0)=0$，对二阶导数积分两次便得到 $\psi(\lambda)\le\lambda^2a^2/2$. 在所得尾界中令右侧等于 $\delta/2$，得到中间两行。

Laplace noise 满足 $\mathbb E[e^{\lambda X}]=(1-\lambda^2)^{-1}$，$|\lambda|<1$. 对 $0<\lambda<1$，

$$
\log\mathbb E\!\left[e^{\lambda\sum\limits_{i=1}^{n}X_i}\right]
=-n\log(1-\lambda^2)
\le\frac{n\lambda^2}{1-\lambda}.
$$

取 $\lambda=\sqrt t/(\sqrt n+\sqrt t)$，Chernoff bound 给出 $\mathbb P\left(\sum\limits_{i=1}^{n}X_i\ge2\sqrt{nt}+t\right)\le e^{-t}$. 利用对称性再乘 $2$，取 $t=\log(4/\delta)$，即得最后一行。 $\square$

## Remark 42 与 Remark 43 中的估计量结论

Proposition 14 的证明只用到两个 location estimators 的误差界，没有用到"估计量是样本均值"这一事实。因此，如果把 empirical means 替换成其它估计量 $\hat\mu_1$、$\hat\nu_1$，并有

$$
\mathbb P\!\left(|\hat\nu-\nu|>\gamma_\nu(n,1,\delta)\right)\le\frac\delta2,
$$

那么在 $\varepsilon_m(R)$、$\alpha_M(R)$ 中分别以 $\gamma_{\mu_1}(n_1',1,\delta)$、$\gamma_{\nu_1}(n_2,1,\delta)$ 替换两个 $\gamma_X$，同一证明仍成立。这是 Remark 42 的内容。这里加权组合的是两组 location estimates；即使每一组估计量都是 MLE，它们的加权平均也未必是合并数据的 MLE.

对于 density 为 $p_\nu(x)=\frac12e^{-|x-\nu|}$ 的 Laplace location family，设 $n=2k+1$ 为奇数。MLE 是 sample median $\hat\nu=X_{(k+1)}$，其中 $X_{(1)}\le\cdots\le X_{(n)}$ 是排序样本。当 $n>2\log(4/\delta)$ 时，一个有效的估计误差界为

$$
\gamma_\nu(n,1,\delta)
=-\log\!\left(1-\sqrt{\frac2n\log\frac4\delta}\right).
$$

**证明。** Laplace 的负 log-likelihood 为常数加 $\sum\limits_{i=1}^{n}|X_i-\nu|$，其斜率在 median 左侧非正、右侧非负，故 median 最小化该目标。

令 $Z_i=X_i-\nu$、$M_n=\operatorname{med}(Z_1,\ldots,Z_n)$. 中心化样本的联合分布关于符号翻转对称，所以 $M_n$ 对称，且 $\hat\nu-\nu=M_n$. 对 $c>0$，$F(c)=\mathbb P(Z_i<c)=1-e^{-c}/2$，并令

$$
N_c=\sum\limits_{i=1}^{n}\mathbf 1_{\{Z_i<c\}}\sim B(n,F(c)).
$$

事件 $M_n\ge c$ 意味着最多 $k$ 个样本小于 $c$，而 $k<n/2$. Hoeffding bound 因而给出

$$
\begin{aligned}
\mathbb P(|\hat\nu-\nu|\ge c)
&=2\mathbb P(M_n\ge c)\\
&\le2\mathbb P\!\left(N_c-nF(c)\le-n(F(c)-1/2)\right)\\
&\le2\exp\!\left(-2n(F(c)-1/2)^2\right)\\
&=2\exp\!\left(-\frac n2(1-e^{-c})^2\right).
\end{aligned}
$$

令该上界等于 $\delta/2$，解出 $c$ 即得显示的 $\gamma_\nu$. 样本数条件保证对数内的量为正。 $\square$

固定 $\delta$、令 $n\to\infty$，由 $-\log(1-x)\sim x$，median 的这个界为 $\sqrt{2\log(4/\delta)/n}$ 的量级；上述 empirical mean 界的主项为 $2\sqrt{\log(4/\delta)/n}$. 这里比较的是这两条 concentration bounds 的常数，不是两种估计量的统计效率：median 在 Laplace 下是 MLE，主项常数更小正是它更有效的体现。

## Lemma 44

设 $X_1,\ldots,X_n$ IID，CDF 为 $F$，empirical CDF 为

$$
\widehat F_n(t)=\frac1n\sum\limits_{i=1}^{n}\mathbf 1_{\{X_i\le t\}}.
$$

Dvoretzky–Kiefer–Wolfowitz inequality 的 sharp 形式为

$$
\mathbb P\!\left(\sup_{t\in\mathbb R}|\widehat F_n(t)-F(t)|>r\right)
\le2e^{-2nr^2},\qquad r>0.
$$

因此，采用 $d(n,\delta)=\sqrt{\dfrac{\log(4/\delta)}{2n}}$ 时，失败概率至多为 $\delta/2$. 原文把这一常数写成 $d(n,2\delta)$，但函数式印成了 $\sqrt{\log(1/(2\delta))/(2n)}$，$\delta>1/2$ 时根号内为负，是笔误；按 $2e^{-2nr^2}$ 反解，失败概率为 $\delta$ 的阈值应是 $\sqrt{\log(2/\delta)/(2n)}$，而 $d(n,\delta)$ 对应失败概率 $\delta/2$，与这里一致。后续证明需要的正是这个双侧形式。

这是一项被直接引用的 empirical-process concentration theorem，意义在于它同时控制所有阈值，而不是只控制一个固定 $t$，所以可以用于由数据决定的删除阈值。其 sharp 概率工具是 uniform empirical process 的双侧越界界：若 $U_i$ IID uniform on $[0,1]$，$G_n(u)=n^{-1}\sum\limits_{i=1}^{n}\mathbf 1_{\{U_i\le u\}}$，则

$$
\mathbb P\!\left(\sup_{0\le u\le1}|G_n(u)-u|>r\right)\le2e^{-2nr^2}.
$$

**从 uniform 形式推出一般形式。** 通过 quantile coupling，可令 $X_i=F^{-1}(U_i)$. 对任意 $t$，$F^{-1}(U_i)\le t$ 当且仅当 $U_i\le F(t)$，除去概率为零的端点，因此

$$
\widehat F_n(t)=G_n(F(t)),\qquad
\sup_{t\in\mathbb R}|\widehat F_n(t)-F(t)|
\le\sup_{0\le u\le1}|G_n(u)-u|.
$$

代入 uniform 越界界即可。这也解释了为什么常数不依赖 $F$，以及为何 $F$ 含原子时仍然成立。 $\square$

## Lemma 46

在 Proposition 7 的 Gaussian 采样设定下，将 unwanted 样本按距 $\hat\nu_1$ 的距离升序排列为 $x_1^{(1:n_1)},\ldots,x_1^{(n_1:n_1)}$，只保留前 $n_1'$ 个，并定义

$$
\hat\mu_1'=\frac1{n_1'}\sum\limits_{i=1}^{n_1'}x_1^{(i:n_1)},\qquad
\hat\tau_r=\left\|x_1^{(n_1':n_1)}-\hat\nu_1\right\|_2.
$$

这里 $\hat\tau_r$ 是留下样本的最大距离，即全部样本的第 $n_1'$ 小距离。若 $n_1'/n_1+d(n_1,\delta)<1$，则以至少 $1-\delta$ 的概率，

$$
\|\hat\mu_1'-\hat\nu_1\|_2
\le\hat\tau_r
\le F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\sigma\gamma(n_2,d,\delta/2).
$$

**证明。** 三角不等式给出

$$
\left\|\frac1{n_1'}\sum\limits_{i=1}^{n_1'}(x_1^{(i:n_1)}-\hat\nu_1)\right\|_2
\le\frac1{n_1'}\sum\limits_{i=1}^{n_1'}\|x_1^{(i:n_1)}-\hat\nu_1\|_2
\le\hat\tau_r.
$$

对每个原始样本，真实距离与估计距离的差满足

$$
\left|\|x_1^{(i)}-\nu_1\|_2-\|x_1^{(i)}-\hat\nu_1\|_2\right|
\le\|\hat\nu_1-\nu_1\|_2.
$$

以失败概率 $\delta/2$ 应用 Lemma 37，可把右侧控制在 $\sigma\gamma(n_2,d,\delta/2)$. 定义真实距离的 empirical CDF

$$
\widehat F_1(t)=\frac1{n_1}\sum\limits_{i=1}^{n_1}
\mathbf 1_{\{\|x_1^{(i)}-\nu_1\|_2\le t\}}.
$$

以失败概率 $\delta/2$ 应用 Lemma 44，在同一共同事件上，$\widehat F_1(t)\ge F_1(t)-d(n_1,\delta)$ 对所有 $t$ 成立。取

$$
t=F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right),
$$

则至少 $n_1'$ 个真实距离不大于 $t$. 对应的估计距离都不大于 $t+\sigma\gamma(n_2,d,\delta/2)$，所以第 $n_1'$ 小估计距离 $\hat\tau_r$ 满足同一上界。 $\square$

论文还指出阈值本身可以有下界：当 $n_1'/n_1>d(n_1,\delta)$ 时，在同一事件上，

$$
F_1^{-1}\!\left(\frac{n_1'}{n_1}-d(n_1,\delta)\right)
-\sigma\gamma(n_2,d,\delta/2)\le\hat\tau_r.
$$

**证明。** 第 $n_1'$ 小真实距离处的 empirical CDF 为 $n_1'/n_1$，DKW 界使总体 CDF 至少为 $n_1'/n_1-d(n_1,\delta)$，因此真实 order statistic 至少为显示的分位数。再利用真实与估计 order statistics 之间的误差界即可。 $\square$

但这不能变成同样大小的 $\|\hat\mu_1'-\hat\nu_1\|_2$ 下界：多个方向上的位移在平均后会抵消，最大半径很大并不意味着均值离中心很远。这正是 Proposition 7 的充分界不能直接当作算法极限的原因，也是原文在 Remark 47 中把它称为一个 open direction 的地方。

## Proposition 15

在 Proposition 14 的 location-family 设定下，改为删除距 $\hat\nu_1$ 最远的 $n_r$ 个 unwanted 样本，然后仍使用 empirical means 的加权平均。定义

$$
F_X(t)=\mathbb P(|X+\mu_1-\nu_1|\le t),\qquad
F_X^{-1}(u)=\inf\{t\ge0:F_X(t)\ge u\}.
$$

这里 $F_X$ 是单个 unwanted 样本到真实 retained 中心距离的分布，与 Proposition 7 中的 $F_1$ 是同一个对象在一般噪声下的版本。假设 $1\le n_1'$ 且 $n_1'/n_1+d(n_1,\delta)<1$. 则以至少 $1-\delta$ 的概率，$0\le\alpha\le\alpha_M(S)$、$\varepsilon\ge\varepsilon_m(S)$ 保证 unlearning，其中

$$
\begin{aligned}
\varepsilon_m(S)
&=\frac{n_1'}{n_1'+n_2}
F_X^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+2\gamma_X(n_2,1,\delta),\\
\alpha_M(S)&=\Delta-\varepsilon_m(S),\qquad\Delta=|\mu_1-\nu_1|.
\end{aligned}
$$

**证明。** $\gamma_X$ 的定义使 $|\hat\nu_1-\nu_1|\le\gamma_X(n_2,1,\delta)$ 以至少 $1-\delta/2$ 的概率成立。真实距离 $|x_1^{(i)}-\nu_1|$ 的 CDF 为 $F_X$，另以失败概率 $\delta/2$ 应用 DKW. 与 Lemma 46 完全相同的 order-statistic 论证给出

$$
|\hat\mu_1'-\hat\nu_1|
\le F_X^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\gamma_X(n_2,1,\delta).
$$

这里即使 $F_X$ 在某段区间不严格递增，generalized quantile 的定义仍保证相应阈值容纳足够的总体概率；不需要把 CDF 当成处处存在普通 inverse 的函数。

于是，在这个概率至少为 $1-\delta$ 的共同事件上，

$$
\begin{aligned}
|\mu-\nu_1|
&\le\frac{n_1'}{n_1'+n_2}|\hat\mu_1'-\hat\nu_1|+|\hat\nu_1-\nu_1|\\
&\le\frac{n_1'}{n_1'+n_2}
F_X^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\left(1+\frac{n_1'}{n_1'+n_2}\right)\gamma_X(n_2,1,\delta)\\
&\le\varepsilon_m(S),\\
|\mu-\mu_1|&\ge\Delta-|\mu-\nu_1|\ge\alpha_M(S).
\end{aligned}
$$

最后应用 Lemma 16 的单向单调性即得结论。 $\square$

注意，距离 CDF 中使用的是 $|X+\mu_1-\nu_1|$，不是它的平方；否则分位数与 location 距离的单位不一致。与 Proposition 7 一样，$2\gamma_X$ 可以收紧为 $\left(1+n_1'/(n_1'+n_2)\right)\gamma_X$，Proposition 16 用的正是收紧后的版本。

## Proposition 16

最后我们比较两种算法已证明的 preservation 上界。设 $d=1$、$\sigma=1$，$1\le n_1'<n_1$、$n_2\ge1$、$\Delta=|\mu_1-\nu_1|$，并采用 Proposition 7 中未把系数放大到 $2$ 的较紧版本：

$$
\begin{aligned}
\varepsilon_m(R)
&=\frac{n_1'\Delta+n_1'\gamma(n_1',1,\delta/2)+n_2\gamma(n_2,1,\delta/2)}{n_1'+n_2},\\
\varepsilon_m(S)
&=\frac{n_1'}{n_1'+n_2}
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+\left(1+\frac{n_1'}{n_1'+n_2}\right)\gamma(n_2,1,\delta/2).
\end{aligned}
$$

这里 $\delta$ 是总失败概率，因此两次估计各用 $\gamma(\cdot,\cdot,\delta/2)$；$F_1(t)=\mathbb P(|Z+\Delta|\le t)$、$Z\sim N(0,1)$，即 $d=1$ 时的 $F_X$. 注意 $\varepsilon_m(R)$ 与 $\varepsilon_m(S)$ 都是 $1-\delta$ 概率下的上界，两者的比较因此是同一置信水平下的比较。定义

$$
A=2\gamma(n_2,1,\delta/2)-\gamma(n_1',1,\delta/2),\qquad
q=\frac{n_1'}{n_1}+d(n_1,\delta),
$$

并假设 $q<1$. 则

$$
\varepsilon_m(S)\le\varepsilon_m(R)
\iff
\left\{
\begin{aligned}
q&<1-\Phi(A),\\
2\Delta&\ge A+\Phi^{-1}(\Phi(A)+q).
\end{aligned}
\right.
$$

第一条条件也可写成

$$
n_r>n_1\Phi(A)+\sqrt{\frac{n_1\log(4/\delta)}2}.
$$

**证明。** 两个上界相减并乘以 $(n_1'+n_2)/n_1'$，得到

$$
\begin{aligned}
\varepsilon_m(S)\le\varepsilon_m(R)
&\iff F_1^{-1}(q)\le\Delta+\gamma(n_1',1,\delta/2)-2\gamma(n_2,1,\delta/2)\\
&\iff F_1^{-1}(q)\le\Delta-A.
\end{aligned}
$$

这里用到 $F_1^{-1}$ 在值域上递增，所以两侧同乘正数、同加常数不改变不等号方向。

对于 $t\ge0$，标准 Gaussian 的对称性给出

$$
\begin{aligned}
F_1(t)
&=\mathbb P(-t-\Delta\le Z\le t-\Delta)\\
&=\Phi(t-\Delta)-\Phi(-t-\Delta).
\end{aligned}
$$

若 $\Delta-A<0$，分位数不等式不可能成立：$F_1^{-1}(q)\ge0$ 而右侧为负。若 $\Delta-A\ge0$，$F_1$ 在非负实线上严格递增，故

$$
\begin{aligned}
F_1^{-1}(q)\le\Delta-A
&\iff q\le\Phi(-A)-\Phi(A-2\Delta)\\
&\iff q\le\Phi(2\Delta-A)-\Phi(A).
\end{aligned}
$$

第二个等价来自 $\Phi(-A)=1-\Phi(A)$ 与 $\Phi(A-2\Delta)=1-\Phi(2\Delta-A)$.

因为 $\Delta$ 有限，$\Phi(2\Delta-A)<1$，所以这首先要求 $q<1-\Phi(A)$. 在此条件下，应用 $\Phi^{-1}$ 得到

$$
2\Delta\ge A+\Phi^{-1}(\Phi(A)+q).
$$

由于 $q>0$，$\Phi^{-1}(\Phi(A)+q)>A$，这还自动保证 $\Delta>A$，所以前面需要的非负阈值条件没有遗漏。最后，把 $q=1-n_r/n_1+d(n_1,\delta)$ 代入第一条条件，便得到删除预算的表达式

$$
n_r>n_1\Phi(A)+\sqrt{\frac{n_1\log(4/\delta)}2}.
$$

$\square$

当 $\delta$ 固定且 $n_1',n_2\to\infty$ 时，$A\to0$，$\Phi(A)\to1/2$；若同时 $n_1\to\infty$，删除比例条件的阈值趋于 $1/2$. 因而这组充分保证要体现 selective removal 的优势，通常需要删除约一半或更多的 unwanted 样本，并满足相应的分布间距条件。注意，这只是两条已证明上界的比较，不是 selective removal 真正优于 random removal 的必要条件：原文 Remark 48 也指出，这里只有 selective removal 的充分界，缺少与之匹配的下界。

所有结果放在一起，论文的论证线索是这样的。检验曲线把两个分布的可区分性压缩成一个函数，Blackwell ordering 又把曲线的比较与随机处理的存在性对上，于是 unlearning 的要求变成可行域的描述，KL、TV 以及任何满足 data-processing 的度量则自动被曲线控制（Proposition 1、2、9 与 Lemma 20）。可行域的几何在平移 Gaussian 下是球与球的差，这一形状对 log-concave location family、Gaussian white noise model 与 Hilbert 空间上的 Gaussian 测度都保持（Proposition 3、4、10、13），对多域情形是这些约束的交（Proposition 11、12）。Poisson 与 Binomial 族不是 location family，可行域由均值比与均值差的联合约束决定，刻画依赖 thinning、superposition 与 Hellinger transform 的不变量（Proposition 5 与 Lemma 28、34、35）。算法层面的结论说明：用有限样本拟合中心，无论是随机删除还是选择性删除，都只能达到信息论可行域的一个子区域，两种算法的 preservation 上界之差由 $\gamma$、$d(n,\delta)$ 与 $F_1^{-1}$ 的相互作用决定（Proposition 6、7、14、15、16）。信息论与算法之间的这段距离，就是论文所说的 information-computation gap.

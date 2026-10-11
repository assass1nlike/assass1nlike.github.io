我们把不希望保留的数据来源建模为分布 $p_1$，把希望保留的数据来源建模为分布 $q_1$，并在指定的分布族 $\mathcal P$ 中寻找编辑后的分布 $p$. 目标是让 $p$ 容易与 $p_1$ 区分，同时难以与 $q_1$ 区分。这里讨论的是删除哪些数据所能达到的统计效果；把指定数据从已训练模型中移除，是后续的 sample-level unlearning 问题。

对于同一可测空间 $(\mathcal W,\mathcal F_{\mathcal W})$ 上的分布 $P,Q$，我们检验 $H_0:P$ 与 $H_1:Q$. 随机化检验 $\phi:\mathcal W\to[0,1]$ 在观察到 $w$ 后，以概率 $\phi(w)$ 拒绝 $H_0$. 它的 type I error 是 $\mathbb E_P[\phi]$，type II error 是 $\mathbb E_Q[1-\phi]$. Trade-off function 定义为

$$
T(P,Q)(u)
=\inf_{\substack{\phi:\mathcal W\to[0,1]\text{ 可测}\\ \mathbb E_P[\phi]\le u}}
\mathbb E_Q[1-\phi],\qquad 0\le u\le1.
$$

这里 $u$ 是允许的 type I error. 曲线越低，意味着在同一误报预算下越容易识别来自 $Q$ 的数据；$T(P,P)(u)=1-u$ 则表示没有可用于区分的信息。以下函数不等式均指在整个 $[0,1]$ 上逐点成立。

给定 removal baseline $f_d=T(P_d,Q_d)$ 与 preservation baseline $f_c=T(P_c,Q_c)$，$(f_d,f_c)$-distributional unlearning 要求

$$
T(p,p_1)\le f_d,\qquad T(p,q_1)\ge f_c.
$$

相应的可行域是

$$
\mathcal R
=\left\{p\in\mathcal P:T(p,p_1)\le f_d,\ T(p,q_1)\ge f_c\right\}.
$$

我们会反复用到两项统计工具。第一项是 Neyman–Pearson 原理：最有力的检验优先拒绝 likelihood ratio $dQ/dP$ 最大的观察值，并在阈值处随机化以满足 type I error 预算。为什么这样最优？设阈值为 $c$、对应检验为 $\phi_*$，则对任意可行的 $\phi$，有

$$
\begin{aligned}
\mathbb E_Q[\phi_*]-\mathbb E_Q[\phi]
&=\mathbb E_P\!\left[\left(\frac{dQ}{dP}-c\right)(\phi_* -\phi)\right]
  +c\left(\mathbb E_P[\phi_*]-\mathbb E_P[\phi]\right)\\
&\ge0.
\end{aligned}
$$

第一项逐点非负，第二项由误报预算非负。若 $Q$ 有位于 $P$ 支撑之外的部分，就先在这部分拒绝；它不消耗 type I error.

第二项是 Blackwell ordering：$T(P,Q)\le T(P',Q')$ 当且仅当存在同一个随机处理规则 $R$，把 $P$ 变成 $P'$、把 $Q$ 变成 $Q'$. 这样的规则称为 Markov kernel；$R(w,A')$ 是输入 $w$ 时输出落在集合 $A'$ 的概率，输出分布记为

$$
(R\circ P)(A')=\int\limits_{\mathcal W}R(w,A')\,dP(w).
$$

我们在使用这一等价关系时假设观察空间为 standard Borel 空间，即与某个完备可分度量空间的 Borel 子集可测同构；本文涉及的欧氏空间、可分 Hilbert 空间、连续路径空间和可数乘积空间都满足这一条件。它保证后面需要的条件分布存在。Theorem 19 会说明这一等价关系的证明。

以下按各项结果在论文中首次出现的顺序展开；附录中重复陈述的结果只写一次。对于影响结论的错误，我们直接给出成立的表述，并在必要处指出原因。

## Proposition 1

若 $p$ 满足 $(f_d,f_c)$-distributional unlearning，则

$$
\operatorname{KL}(p_1\Vert p)\ge\operatorname{KL}(Q_d\Vert P_d),
\qquad
\operatorname{KL}(q_1\Vert p)\le\operatorname{KL}(Q_c\Vert P_c).
$$

这里 $\operatorname{KL}(Q\Vert P)=\int\limits\log(dQ/dP)\,dQ$；当 $Q\not\ll P$ 时取 $+\infty$. 因而，检验意义下的 unlearning 蕴含以这两个 baseline KL 为阈值的 KL-unlearning.

**证明。** Blackwell ordering 给出两个 kernel，满足

$$
R_d\circ p=P_d,\quad R_d\circ p_1=Q_d;
\qquad
R_c\circ P_c=p,\quad R_c\circ Q_c=q_1.
$$

KL 的 data-processing inequality 表示同一个随机处理不能增加两个分布的 KL. 它来自条件 Jensen 不等式：若 $L=dQ/dP$，在 $X\sim P$、$Y\mid X\sim R(X,\cdot)$ 下，输出 likelihood ratio 是 $\mathbb E[L\mid Y]$，因此

$$
\operatorname{KL}(R\circ Q\Vert R\circ P)
=\mathbb E\!\left[\mathbb E[L\mid Y]\log\mathbb E[L\mid Y]\right]
\le\mathbb E[L\log L]
=\operatorname{KL}(Q\Vert P).
$$

对 $R_d,R_c$ 分别应用这一不等式，就得到结论。 $\square$

若 baselines 是 $T(N(0,1),N(\alpha,1))$ 和 $T(N(0,1),N(\varepsilon,1))$，对应的 KL 阈值分别为 $\alpha^2/2$ 与 $\varepsilon^2/2$. 因而 Gaussian baseline 中的 $\alpha,\varepsilon$ 是标准差单位下的距离，而不是 KL 本身。

## Lemma 2

设另一种独立模态的编辑分布 $p'$ 相对于 $p_1',q_1'$ 满足 $(f_d',f_c')$-unlearning. 则联合分布 $p\otimes p'$ 相对于 $p_1\otimes p_1',q_1\otimes q_1'$ 满足

$$
(f_d\otimes f_d',\ f_c\otimes f_c')\text{-unlearning},
$$

这里 $P\otimes P'$ 表示独立乘积分布，而

$$
T(P,Q)\otimes T(P',Q'):=T(P\otimes P',Q\otimes Q').
$$

**证明。** 对 removal，分别把两种模态映射到各自 baseline 的 kernel 可以独立执行，得到

$$
(R_d\otimes R_d')\circ(p\otimes p')=P_d\otimes P_d',
\qquad
(R_d\otimes R_d')\circ(p_1\otimes p_1')=Q_d\otimes Q_d'.
$$

根据 Blackwell ordering，这说明 $T(p\otimes p',p_1\otimes p_1')\le f_d\otimes f_d'$. 对 preservation，kernel 的方向相反：从两个 preservation baseline 独立生成两种编辑模态及保留模态，得到 $T(p\otimes p',q_1\otimes q_1')\ge f_c\otimes f_c'$. $\square$

这个结论依赖模态之间的独立性。连续应用它可以处理任意有限个独立模态。如果额外加入一列在两种假设下都服从同一分布的数据，那么这列既可以独立生成，也可以被丢弃，trade-off function 因而不变。

论文还用一个外部极限定理解释大量模态时的 baseline：若 $f_n(0)=1$，并且同一行中 $n$ 个相同 baseline 的乘积 $f_n^{\otimes n}$ 逐点收敛到一个 trade-off function，那么极限属于

$$
\mathcal I=
\left\{T(P,Q):
\begin{gathered}
P\text{ 是 }\mathbb R\text{ 上的 infinitely divisible 分布},\\
\int\limits_{\mathbb R}e^x\,dP(x)=1,\quad dQ(x)=e^x\,dP(x)
\end{gathered}
\right\}.
$$

这里 infinitely divisible 指对每个正整数 $m$，$P$ 都能写成某个分布的 $m$ 重卷积。之所以出现它，是因为独立模态的 log-likelihood ratio 相加；$dQ=e^x dP$ 则是 log-likelihood ratio 在两种假设下分布的换测度关系。这一引用结果针对给定的乘积收敛情形，并不声称任意异质模态序列都会自动具有这样的极限。

## Proposition 2

若 $p$ 满足 $(f_d,f_c)$-unlearning，则

$$
\operatorname{TV}(p,p_1)\ge\operatorname{TV}(P_d,Q_d),
\qquad
\operatorname{TV}(p,q_1)\le\operatorname{TV}(P_c,Q_c).
$$

这里 total variation distance 是 $\operatorname{TV}(P,Q)=\sup_{A\in\mathcal F_{\mathcal W}}|P(A)-Q(A)|$. 它还满足

$$
2\operatorname{TV}(P,Q)
=\sup_{\substack{h:\mathcal W\to[-1,1]\\h\text{ 可测}}}
\left|\mathbb E_P[h]-\mathbb E_Q[h]\right|.
$$

**证明。** 对任意 $h:\mathcal W'\to[-1,1]$，处理前对应的函数

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

这里 TV 的函数表示可由 $P-Q$ 的正负部分得到：$|h|\le1$ 给出上界，取 $h$ 在正部分为 $1$、负部分为 $-1$ 则达到该上界。随后对 Proposition 1 中的两个 kernel 应用 TV 的 data-processing inequality 即可。 $\square$

在下游任务中，preservation 上界控制每一个取值于 $[-1,1]$ 的 loss 的期望变化。Removal 下界则说明存在某个这样的函数能区分编辑分布与 unwanted 分布。注意，它不能保证每一个指定预测器的 loss 都上升，更不能仅由绝对差推断变化方向。

对于 Gaussian baseline，两个密度在均值中点相交，直接积分得到

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

这里 $d$ 是特征维数，$\mu_1,\nu_1$ 是两个数据来源的中心，$\Sigma$ 是共同的正定 covariance matrix. 采用 baselines

$$
f_d=T(N(0,1),N(\alpha,1)),\qquad
f_c=T(N(0,1),N(\varepsilon,1)),\qquad\alpha,\varepsilon\ge0.
$$

则可行域为

$$
\mathcal R=
\left\{N(\mu,\Sigma):\alpha'(\mu)\ge\alpha,\ \varepsilon'(\mu)\le\varepsilon\right\},
$$

其中

$$
\begin{aligned}
\alpha'(\mu)^2&=\left\langle\mu_1-\mu,\Sigma^{-1}(\mu_1-\mu)\right\rangle,\\
\varepsilon'(\mu)^2&=\left\langle\nu_1-\mu,\Sigma^{-1}(\nu_1-\mu)\right\rangle.
\end{aligned}
$$

令 $\Delta=\left\|\Sigma^{-1/2}(\mu_1-\nu_1)\right\|_2$. 则

$$
\mathcal R\ne\varnothing\iff\alpha\le\Delta+\varepsilon.
$$

**证明。** 对观察值先减去 $\mu$，再乘 $\Sigma^{-1/2}$；这个可逆变换不丢失检验信息。变换后的两分布具有单位 covariance，只在向量 $\Sigma^{-1/2}(\mu_1-\mu)$ 的方向上存在均值差。投影到该方向后，likelihood ratio 与原观察值的 likelihood ratio 相同。因此

$$
\begin{aligned}
T(N(\mu,\Sigma),N(\mu_1,\Sigma))
&=T(N(0,1),N(\alpha'(\mu),1)),\\
T(N(\mu,\Sigma),N(\nu_1,\Sigma))
&=T(N(0,1),N(\varepsilon'(\mu),1)).
\end{aligned}
$$

对于距离 $s\ge0$，Neyman–Pearson 检验是拒绝大于 $\Phi^{-1}(1-u)$ 的观察值，所以

$$
T(N(0,1),N(s,1))(u)=\Phi\!\left(\Phi^{-1}(1-u)-s\right).
$$

对每个 $0<u<1$，右侧随 $s$ 严格递减，函数约束于是恰好变成所述距离约束。

在 whitened coordinates 中，可行中心位于以 $\nu_1$ 为中心的闭 $\varepsilon$-球内，同时位于以 $\mu_1$ 为中心的开 $\alpha$-球外。对球内任意中心，三角不等式给出

$$
\left\|\Sigma^{-1/2}(\mu-\mu_1)\right\|_2\le\Delta+\varepsilon.
$$

若 $\Delta>0$，取

$$
\mu=\nu_1+\frac{\varepsilon}{\Delta}(\nu_1-\mu_1)
$$

即可达到等号；若 $\Delta=0$，取距共同中心 $\varepsilon$ 的任意方向即可。这证明非空条件。 $\square$

球内距 unwanted 中心的最小距离为 $\max\{\Delta-\varepsilon,0\}$. 因而整个 preservation 球都可行的准确条件是

$$
\alpha\le\max\{\Delta-\varepsilon,0\}.
$$

对于 $\alpha>0$，这就是 $\alpha\le\Delta-\varepsilon$；$\alpha=0$ 时 removal 约束恒成立。其余非空情形由两个球面的相交关系决定；在一维中也可能是两个区间，不能一概称为单个 cap.

## Lemma 8

在 Proposition 3 的设定下，固定 preservation 预算 $\varepsilon$ 时，可达到的最大 removal 距离是 $\Delta+\varepsilon$. 因而论文所定义的 frontier 为

$$
\operatorname{PF}(p_1,q_1,\mathcal P)
=\left\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\right\}.
$$

**证明。** Proposition 3 的三角不等式给出上界，而沿 $\mu_1\to\nu_1$ 的方向继续移动 $\varepsilon$ 个 Mahalanobis 距离的构造达到上界。 $\square$

这解释了为什么只保留 $q_1$ 并非所有目标下的最佳选择：它达到 $\varepsilon=0$、$\alpha=\Delta$；允许中心越过 $\nu_1$，则能用一些 preservation 损失换取更强的 removal.

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

这里 $W(\phi)=\int\limits_0^1\phi(t)\,dB_t$ 是 Wiener integral. 它先对分段常数函数定义为 Brownian increments 的加权和，再用 $\mathbb E[W(\phi)^2]=\|\phi\|_H^2$ 延拓到 $H$. 因此 white noise 是一族 Gaussian 随机变量，并非取值于 $L^2$ 的普通随机函数。

设 unwanted 与 retained 分布分别为 $p_f,p_g$，候选族为 $\mathcal P=\{p_h:h\in H\}$，采用与 Proposition 3 相同的 Gaussian baselines. 则

$$
\mathcal R=\left\{p_h:\|f-h\|_H\ge\alpha,\ \|g-h\|_H\le\varepsilon\right\}.
$$

令 $\Delta=\|f-g\|_H$，则非空条件为 $\alpha\le\Delta+\varepsilon$，frontier 仍为 $\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\}$. 整个以 $g$ 为中心的 preservation 球都可行，当且仅当 $\alpha\le\max\{\Delta-\varepsilon,0\}$.

**证明。** 先说明无限维观察为何仍归结为一个实数。取 $H$ 的 orthonormal basis $\{e_j\}_{j\ge1}$，坐标观察 $Y_f(e_j)$ 独立且服从 $N(\langle f,e_j\rangle_H,1)$. 前 $m$ 个坐标的 log-likelihood ratio 是

$$
\sum\limits_{j=1}^{m}\langle g-f,e_j\rangle_H
\left(Y_f(e_j)-\langle f,e_j\rangle_H\right)
-\frac12\sum\limits_{j=1}^{m}\langle g-f,e_j\rangle_H^2.
$$

由于 $g-f\in H$，随机和在 $L^2$ 中收敛到 $W(g-f)$，确定性和收敛到 $\|g-f\|_H^2$. 对应的 likelihood ratios 的二阶矩至多为 $\exp(\|g-f\|_H^2)$，所以它们一致可积，极限确实是整个观察的 Radon–Nikodym derivative. 从而

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

最优检验只需要这个 likelihood ratio，因此 $T(p_f,p_g)=T(N(0,1),N(\Delta,1))$. 对 $h,f$ 和 $h,g$ 分别应用这一结果，得到距离形式。Hilbert 空间的三角不等式给出非空条件的必要性，取 $h=g+\varepsilon(g-f)/\Delta$ 给出 $\Delta>0$ 时的充分性；$\Delta=0$ 时任选单位方向。 $\square$

## Proposition 5

令 $P(\mu)$ 表示均值为 $\mu>0$ 的 Poisson 分布，即 $P(\mu)\{k\}=e^{-\mu}\mu^k/k!$. 设

$$
p_1=P(\mu_1),\quad q_1=P(\nu_1),\quad
\mathcal P=\{P(\mu):\mu>0\},
$$

并采用 $f_d=T(P(1),P(\alpha))$、$f_c=T(P(1),P(\varepsilon))$，其中 $\alpha>1$、$0<\varepsilon<1$. 则可行均值为

$$
\mathcal R_P=
\left[\nu_1,\ \min\left\{\frac{\mu_1}{\alpha},\mu_1-\alpha+1,
\frac{\nu_1}{\varepsilon},\nu_1-\varepsilon+1\right\}\right],
$$

区间非空当且仅当

$$
\nu_1\le\min\left\{\frac{\mu_1}{\alpha},\mu_1-\alpha+1\right\}.
$$

**证明。** Poisson 的关键结构是两种随机处理：先把计数 $X$ 中的每个事件以概率 $s\in[0,1]$ 独立保留，再加入独立的 $P(r)$ 噪声，$r\ge0$. 输出均值从 $\theta$ 变为 $s\theta+r$. 前一步成立是因为

$$
\mathbb E[z^{B(X,s)}]
=\mathbb E[(1-s+sz)^X]
=\exp(s\theta(z-1)),
$$

这里 $B(X,s)$ 是给定 $X$ 后的 Binomial 随机变量；后一部成立是因为独立 Poisson 的 probability generating functions 相乘后仍为 Poisson 的形式。

Lemma 28 会证明：一个 Poisson 二元实验能够经随机处理变成另一个，当且仅当存在上述形式的 $s,r$. 因而 removal 与 preservation 分别等价于存在 $s_1,s_2\in[0,1]$、$r_1,r_2\ge0$ 使

$$
1=s_1\mu+r_1,\quad\alpha=s_1\mu_1+r_1;
\qquad
\mu=s_2+r_2,\quad\nu_1=s_2\varepsilon+r_2.
$$

第一对等式给出 $s_1=(\alpha-1)/(\mu_1-\mu)$. 条件 $0\le s_1\le1$ 与 $r_1=1-s_1\mu\ge0$ 依次给出

$$
\mu\le\mu_1-\alpha+1,\qquad \mu\le\mu_1/\alpha.
$$

第二对等式给出 $s_2=(\mu-\nu_1)/(1-\varepsilon)$. 条件 $0\le s_2\le1$ 与 $r_2=\mu-s_2\ge0$ 给出

$$
\nu_1\le\mu\le\nu_1+1-\varepsilon,\qquad \mu\le\nu_1/\varepsilon.
$$

相交即得所述区间。由于 preservation 的两个上端点都不小于 $\nu_1$，非空性只取决于 removal 的两个上界。 $\square$

对于计数型特征，例如一段文本中特定词语的出现次数，这个可行域同时约束均值差与均值比；仅用均值间的一个距离不足以描述可区分性。

## Proposition 6

现在我们只观察有限数据。设两组相互独立的样本分别来自 $p_1=N(\mu_1,\sigma^2I_d)$、$q_1=N(\nu_1,\sigma^2I_d)$，样本数为 $n_1,n_2$，已知 $\sigma>0$. 从第一组中独立于数据值均匀删除 $n_r$ 个样本，令 $n_1'=n_1-n_r\ge1$、$n_2\ge1$. 两组剩余样本的均值记为 $\hat\mu_1',\hat\nu_1$，编辑分布为 $p=N(\mu,\sigma^2I_d)$，其中

$$
\mu=\frac{n_1'\hat\mu_1'+n_2\hat\nu_1}{n_1'+n_2}.
$$

这里合并数据的 Gaussian log-likelihood 只依赖平方残差之和，对 $\mu$ 求导即可得到上述 MLE；它不是两个真实分布混合后的精确分布，而是对剩余数据拟合的共同方差 Gaussian.

沿用论文的函数

$$
\gamma(n,d,\delta)=\frac1{\sqrt n}
\sqrt{d+2\sqrt{d\log(1/\delta)}+2\log(1/\delta)},
\qquad 0<\delta<1,
$$

并令 $\sigma\Delta=\|\mu_1-\nu_1\|_2$. 以下采用 $\delta/2$ 为两次均值估计各分配失败概率。定义

$$
\begin{aligned}
\varepsilon_m(R)
&=\frac{n_1'\Delta}{n_1'+n_2}
+\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2},\\
\alpha_M(R)&=\Delta-\varepsilon_m(R).
\end{aligned}
$$

则以至少 $1-\delta$ 的概率，所有满足 $0\le\alpha\le\alpha_M(R)$、$\varepsilon\ge\varepsilon_m(R)$ 的 Gaussian baselines 同时达到 unlearning.

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

注意，论文给出的 $\gamma$ 公式对应单次失败概率 $\delta$，不能直接对两次估计使用它后仍声称总失败概率为 $\delta$. 此处的 $\delta/2$ 补齐了这一点。若 $n_1'=0$，直接令 $\mu=\hat\nu_1$，只应用一次均值界即可，无需计算未定义的 $\gamma(0,d,\delta)$.

上述推导还给出两个方向的控制：

$$
\begin{aligned}
\left|\frac{\|\mu-\nu_1\|_2}{\sigma}-\frac{n_1'\Delta}{n_1'+n_2}\right|
&\le\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2},\\
\left|\frac{\|\mu-\mu_1\|_2}{\sigma}-\frac{n_2\Delta}{n_1'+n_2}\right|
&\le\frac{n_1'\gamma(n_1',d,\delta/2)+n_2\gamma(n_2,d,\delta/2)}{n_1'+n_2}.
\end{aligned}
$$

因此，当估计误差趋于零时，random removal 的中心仍位于两个总体中心之间，表现趋于 $(\alpha,\varepsilon)=(n_2\Delta/(n_1'+n_2),n_1'\Delta/(n_1'+n_2))$. 这与 Lemma 8 中可以越过 retained 中心的信息论最优构造不同。不过，这只证明该特定算法的限制，并未证明所有高效算法都存在 computational hardness barrier.

## Proposition 7

在 Proposition 6 的采样设定下，selective removal 先计算 $\hat\nu_1$，然后删除距离 $\hat\nu_1$ 最远的 $n_r$ 个 unwanted 样本，并用剩余样本拟合同样的加权均值 $\mu$. 令

$$
d(n,\delta)=\sqrt{\frac{\log(4/\delta)}{2n}},\qquad
F_1(t)=\mathbb P\!\left(\|\sigma Z+\mu_1-\nu_1\|_2\le t\right),\quad Z\sim N(0,I_d).
$$

这里 $d(n,\delta)$ 是经验 CDF 的误差界，不是维数 $d$；$F_1^{-1}(u)=\inf\{t\ge0:F_1(t)\ge u\}$ 是分位数。假设

$$
1\le n_1'\le n_1,\qquad
\frac{n_1'}{n_1}+d(n_1,\delta)<1.
$$

则以至少 $1-\delta$ 的概率，所有 $0\le\alpha\le\alpha_M(S)$、$\varepsilon\ge\varepsilon_m(S)$ 都可保证 unlearning，其中

$$
\begin{aligned}
\varepsilon_m(S)
&=\frac{n_1'}{\sigma(n_1'+n_2)}
F_1^{-1}\!\left(\frac{n_1'}{n_1}+d(n_1,\delta)\right)
+2\gamma(n_2,d,\delta/2),\\
\alpha_M(S)&=\Delta-\varepsilon_m(S).
\end{aligned}
$$

**证明。** 对每个 unwanted 样本，使用真实 retained 中心与估计中心得到的距离至多相差 $\|\hat\nu_1-\nu_1\|_2$. 这种逐项误差也控制排序后的第 $n_1'$ 小距离：若至少 $n_1'$ 个真实距离不超过 $t$，则这 $n_1'$ 个样本的估计距离都不超过 $t+\|\hat\nu_1-\nu_1\|_2$.

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

分位数条件保证这里的上界有限；若分位数参数达到或超过 $1$，原式不能给出有限保证。证明还说明 $2\gamma$ 可以保留为较紧的 $\left(1+n_1'/(n_1'+n_2)\right)\gamma$. 注意，$\varepsilon_m(S)$ 是可证明的上界，不能据此断言更小的 preservation 误差实际无法达到。

## Lemma 15

Gaussian trade-off function 记为

$$
f_{G,\varepsilon}(u)=T(N(0,1),N(\varepsilon,1))(u)
=\Phi\!\left(\Phi^{-1}(1-u)-|\varepsilon|\right).
$$

它满足以下性质：对非负参数，$\varepsilon_1\le\varepsilon_2$ 当且仅当 $f_{G,\varepsilon_1}\ge f_{G,\varepsilon_2}$；交换两个具有共同 covariance 的 Gaussian 不改变 trade-off function；对任意非空指标集 $I$，若 $\sup_{i\in I}|\varepsilon_i|<\infty$，则

$$
\inf_{i\in I}f_{G,\varepsilon_i}(u)
=f_{G,\sup_{i\in I}|\varepsilon_i|}(u).
$$

此外，若 $\Sigma\succ0$ 且 $\varepsilon^2=\langle\mu_1-\nu_1,\Sigma^{-1}(\mu_1-\nu_1)\rangle$，则

$$
T(N(\mu_1,\Sigma),N(\nu_1,\Sigma))=f_{G,\varepsilon}.
$$

**证明。** 正参数时的显式公式已在 Proposition 3 中由阈值检验得到；对负参数，将观察值乘 $-1$，得到参数 $|\varepsilon|$. 对 $0<u<1$，$\Phi$ 严格递增，因而公式对 $|\varepsilon|$ 严格递减，这同时证明排序的两个方向。对有界的参数族，取趋近参数上确界的序列，再用 $\Phi$ 的连续性，就得到逐点下确界公式。

对于共同 covariance 的多维 Gaussian，whitening 后可再作 orthogonal rotation，把均值差旋转到第一坐标。其余坐标在两种假设下相同且独立，可以被丢弃，也可以独立生成。因此它们不改变检验能力，剩余第一坐标就是距离参数为 $\varepsilon$ 的一维实验。交换两个均值不改变该距离，故也不改变曲线。 $\square$

注意，参数无界时，逐点下确界在 $u=0$ 等于 $1$，在 $u>0$ 等于 $0$；它不是某个有限距离的 Gaussian trade-off function. 所以把下确界仍写成同一有限参数族成员，需要上面的有界条件。

## Lemma 16

设随机变量 $X$ 关于 $0$ 对称，具有 log-concave density 和 CDF $F$. Log-concave 指 density $\rho$ 满足

$$
\rho(\lambda x+(1-\lambda)y)
\ge\rho(x)^\lambda\rho(y)^{1-\lambda},\qquad 0<\lambda<1.
$$

其支撑是一个区间；在支撑内部，等价地 $\log\rho$ 为凹函数。对任意 $t_1,t_2\in\mathbb R$，令 $\delta=|t_2-t_1|$，则

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

**证明。** 先考虑正向平移 $\delta>0$. 在两 density 都为正的区域，log-likelihood ratio 是 $\log\rho(x-\delta)-\log\rho(x)$. 凹函数在更靠左的区间上具有更大的增量，所以这个差随 $x$ 不减；若可微，其导数就是 $(\log\rho)'(x-\delta)-(\log\rho)'(x)\ge0$. 不可微时用凹函数的左右导数得到同一结论。支撑以外的零 density 按 likelihood ratio 为 $0$ 或 $+\infty$ 处理。

因此 Neyman–Pearson 检验仍优先拒绝较大的 $x$. 在 $X$ 下选阈值 $F^{-1}(1-u)$，在 $\delta+X$ 下接受的概率正是 $F(F^{-1}(1-u)-\delta)$. 平移不改变检验；反射与 $X\overset d=-X$ 则把负向平移变成正向平移，并证明交换分布的对称性。

单调性直接来自 $F$ 不减。若 $F$ 在整个实线上严格递增，任何两个不同距离都在 $0<u<1$ 处产生严格不同的曲线。若支撑为 $[-a,a]$，距离达到 $2a$ 后，两分布已互相奇异，曲线恒为 $0$. 在 $0\le\varepsilon_1<\varepsilon_2<2a$ 时，可选择一个阈值，使平移后的两个阈值在支撑内部或其中一个刚低于左端点，得到严格的 CDF 差。因此不同距离只有在都达到 $2a$ 后才会给出同一条曲线。 $\square$

注意，uniform 分布属于 symmetric log-concave 分布；平移超过支撑宽度后再增加距离，不会增强已经完美的可区分性。这是原文无条件使用严格参数排序所遗漏的情形。

## Lemma 17

对非增函数 $h:[0,1]\to[0,1]$，定义 generalized inverse

$$
h^{-1}(t)=\inf\{u\in[0,1]:h(u)\le t\},\qquad\inf\varnothing:=1.
$$

若 $f\le g$，则 $f^{-1}\le g^{-1}$.

**证明。** 对任意 $t$，$g(u)\le t$ 蕴含 $f(u)\le t$，因此

$$
\{u:g(u)\le t\}\subseteq\{u:f(u)\le t\}.
$$

右侧集合更大，其下确界不大于左侧集合的下确界。约定空集下确界为 $1$ 后，结论在端点同样成立。 $\square$

对 trade-off functions 还有 $T(P,Q)^{-1}=T(Q,P)$. 因为检验 $\phi$ 的两种错误为 $(\mathbb E_P[\phi],\mathbb E_Q[1-\phi])$；交换假设后使用 $1-\phi$，错误对恰好交换。最优错误边界因此关于两个坐标的交换反射，反射后的函数就是上述 generalized inverse.

## Theorem 19

对 standard Borel 空间上的两对分布 $(P,Q)$、$(P',Q')$，以下两件事等价：

$$
T(P,Q)\le T(P',Q');
\qquad
\exists R:\ R\circ P=P',\ R\circ Q=Q'.
$$

**证明。** 若 kernel 存在，任意输出检验 $\phi'$ 都可以在输入端实施：使用拒绝概率 $R\circ\phi'$. 两种错误完全相同，故输入端能达到的最优 type II error 不会更大。这证明容易的方向。

反方向要说明整条检验曲线为何足以重构一个随机处理。我们使用 convex order 的 martingale coupling theorem：若两个取值于 $[0,1]$ 的随机变量 $U,U'$ 具有相同均值，且对所有凸函数 $\psi$ 都有 $\mathbb E[\psi(U)]\ge\mathbb E[\psi(U')]$，则存在具有这两个边缘分布的 coupling，使

$$
\mathbb E[U\mid U']=U'.
$$

这一工具的含义是：分布更集中的 $U'$ 可以看成较分散的 $U$ 的条件均值。在紧区间上，要检验这个凸函数族，只需检验 $\psi(u)=(u-t)_+$ 和均值；因为分段线性凸函数是这些函数与 affine 函数的非负线性组合，一般凸函数再由分段线性函数逼近。这里 $(x)_+=\max\{x,0\}$. Martingale coupling theorem 是此证明使用的标准概率论工具。

令 $M=(P+Q)/2$，在 $W\sim M$ 下定义

$$
U(W)=\frac{dQ}{d(P+Q)}(W).
$$

这里 $U$ 是两种假设先验概率各为 $1/2$ 时，观察后的 $H_1$ posterior probability；$dQ/dM=2U$，$dP/dM=2(1-U)$，且 $\mathbb E_M[U]=1/2$. 对 $(P',Q')$ 同样定义 $M',U'$.

对于任意 $c\ge0$，最优加权检验收益为

$$
\begin{aligned}
\sup_{0\le\phi\le1}\left(\mathbb E_Q[\phi]-c\mathbb E_P[\phi]\right)
&=\sup_{0\le u\le1}\left(1-T(P,Q)(u)-cu\right)\\
&=2\mathbb E_M\!\left[((1+c)U-c)_+\right].
\end{aligned}
$$

第一步是在每个误报预算下取最大 power；第二步对被积函数逐点选择 $\phi=1$ 或 $0$. 由 $T(P,Q)\le T(P',Q')$，这个收益不小于 primed 实验的收益。令 $t=c/(1+c)$，便得到所有 $0\le t<1$ 的 stop-loss 不等式

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

把 $2U$ 换成 $2(1-U)$，同样得到输入 $P$ 时输出 $P'$. 因而所需 kernel 存在。 $\square$

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

这说明检验曲线同时控制所有满足 data processing 的分布差异，而不仅是 KL 或 TV.

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

## Proposition 9

现在把分布可区分性与一个具体下游 loss 联系起来。设观察为 $(x,y)\in\mathcal X\times\mathcal Y$，$\mathcal Y$ 为有限或可数 label 空间，预测器 $h(x)$ 输出 label probability. 定义 log-loss

$$
L(h;p)=\mathbb E_{(x,y)\sim p}[-\log h(x)(y)].
$$

设预测器族包含真实条件分布，并取 $h(x)=p(\cdot\mid x)$、$h_1(x)=p_1(\cdot\mid x)$、$h_2(x)=q_1(\cdot\mid x)$；这分别是在相应分布下最优的预测器。假设涉及的 KL 与条件 entropy 有限，以保证以下差值有定义。若

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

将 $p_1$ 替换成 $q_1$，同一计算给出第二个不等式。 $\square$

结合 Proposition 1，我们可以令 $\alpha=\operatorname{KL}(Q_d\Vert P_d)$、$\varepsilon=\operatorname{KL}(Q_c\Vert P_c)$. 这个结论中的边缘 KL 不能省略：如果分布差异完全来自输入频率变化，而 label 条件分布没有变化，下游预测器并不需要因此改变。注意，在不包含 Bayes predictor 的受限模型族中，仅有“最小化了训练分布的 log-loss”不足以得到上述等式。

## Proposition 10

设 $p_1=\mu_1+X$、$q_1=\nu_1+X$，其中 $X$ 满足 Lemma 16，采用 $f_d=f_{X,\alpha}$、$f_c=f_{X,\varepsilon}$，$\alpha,\varepsilon\ge0$.

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

注意，上述相交集合可以由两个区间组成。例如 $\mu_1=\nu_1=0$、$0<\alpha<\varepsilon$ 时，它等于 $[-\varepsilon,-\alpha]\cup[\alpha,\varepsilon]$. 因此原文将所有部分相交情形写成一个子区间并不成立。

对于 bounded support，设其闭包为 $[-a,a]$. 准确的距离条件改为

$$
|\mu-\mu_1|\ge\min\{\alpha,2a\},
\qquad
\begin{cases}
|\mu-\nu_1|\le\varepsilon,&\varepsilon<2a,\\
\text{无额外约束},&\varepsilon\ge2a.
\end{cases}
$$

**证明。** 把 Lemma 16 中的截断距离排序分别代入 removal 与 preservation 即得。当 $\varepsilon<2a$ 时，非空条件为 $\min\{\alpha,2a\}\le\Delta+\varepsilon$；当 $\varepsilon\ge2a$ 时 preservation baseline 已恒为 $0$，总能把 $\mu$ 移得足够远以满足 removal. $\square$

因此若 $\varepsilon<2a$ 且 $\Delta+\varepsilon<2a$，最大 $\alpha$ 仍为 $\Delta+\varepsilon$；否则达到完全分离后，任意更大的 $\alpha$ 都代表同一条 baseline，不能再把 $\alpha$ 的数值增长当作更强的 removal.

## Proposition 11

对 $k$ 个 unwanted 分布与 $l$ 个 retained 分布，我们要求每个约束同时成立：

$$
T(p,p_i)\le f_{di}\quad(1\le i\le k),\qquad
T(p,q_j)\ge f_{cj}\quad(1\le j\le l).
$$

设 $p_i=N(\mu_i,\Sigma)$、$q_j=N(\nu_j,\Sigma)$，$\Sigma\succ0$，baselines 为 $f_{di}=f_{G,\alpha_i}$、$f_{cj}=f_{G,\varepsilon_j}$. 则

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

注意，原文把这个并集替换成从最左端点到最右端点的一个大开区间，会删掉本来可行的间隙。例如 $\mu_1=-2,\mu_2=2,\alpha_1=\alpha_2=1$，retained 约束为 $[-1/2,1/2]$ 时，整个 retained 区间都可行，但该替换会错误地判为空。

## Proposition 12

设 $p_i=\mu_i+X$、$q_j=\nu_j+X$，$X$ 具有共同的 symmetric log-concave density，先假设其支撑为 $\mathbb R$. 对 baselines $f_{di}=f_{X,\alpha_i}$、$f_{cj}=f_{X,\varepsilon_j}$，可行中心为

$$
\mathcal R=
\left[\max_{1\le j\le l}(\nu_j-\varepsilon_j),\ \min_{1\le j\le l}(\nu_j+\varepsilon_j)\right]
\setminus\bigcup\limits_{i=1}^{k}(\mu_i-\alpha_i,\mu_i+\alpha_i).
$$

**证明。** Lemma 16 将每个约束分别转成 $|\mu-\mu_i|\ge\alpha_i$、$|\mu-\nu_j|\le\varepsilon_j$. 后一组取交集得到显示的闭区间，前一组排除各个开区间，故得到公式。 $\square$

若支撑闭包为 $[-a,a]$，则把每个删除半径替换成 $\min\{\alpha_i,2a\}$，并只对满足 $\varepsilon_j<2a$ 的 retained 约束取交集；没有此类约束时，保留区间为整个 $\mathbb R$. 这是 Proposition 10 的截断距离条件逐项取交集的直接结果。

## Lemma 26

设 $H$ 为实可分 Hilbert 空间，$K:H\to H$ 为非负、自伴、trace-class operator. 这些条件分别保证 covariance 非负、对称，以及 Gaussian 随机元素具有有限的平均平方范数。取 eigenbasis $\{e_j\}_{j\ge1}$，令 $Ke_j=\lambda_j e_j$，则 $\lambda_j\ge0$、$\sum\limits_{j\ge1}\lambda_j<\infty$.

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

这里 $h_j=\langle h,e_j\rangle_H$；$K^{-1/2}h$ 指位于 $(\ker K)^\perp$ 中的唯一 preimage. 这个范数把低噪声方向的位移赋予更大的统计距离。

令 $P_h=N(h,K)$，$h\in H_K$. 则对 $h,h'\in H_K$，

$$
T(P_h,P_{h'})=T(N(0,1),N(\Delta,1)),\qquad
\Delta^2=\|h'-h\|_{H_K}^2.
$$

**证明。** 令 $v=h'-h$. 对每个正 eigenvalue 的坐标，在 $P_h$ 下，$\langle X-h,e_j\rangle_H/\sqrt{\lambda_j}$ 是独立标准 Gaussian. 前 $m$ 个有效坐标的 log-likelihood ratio 是

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
N(\Delta^2/2,\Delta^2),&P_{h'}.
\end{cases}
$$

Likelihood-ratio test 将整个无限维实验归结为这个一维 Gaussian 实验，得到结论。 $\square$

注意，一般只有 $\overline{\operatorname{Range}(K^{1/2})}=(\ker K)^\perp$，不能像原文一样去掉闭包。并且 $K^{-1}v$ 或 $K^{-1/2}X$ 未必是 $H$ 中的元素；上面的收敛随机级数才是 likelihood 中相应线性项的严格含义。

## Proposition 13

在 Lemma 26 的条件下，进一步假设 $H_K\ne\{0\}$. 设 $p_1=N(\mu_1,K)$、$q_1=N(\nu_1,K)$，$\mu_1,\nu_1\in H_K$，候选族为 $\mathcal P=\{N(\mu,K):\mu\in H_K\}$. 对 Gaussian baselines，

$$
\mathcal R=
\left\{N(\mu,K):\|\mu-\mu_1\|_{H_K}\ge\alpha,
\ \|\mu-\nu_1\|_{H_K}\le\varepsilon\right\}.
$$

令 $\Delta=\|\mu_1-\nu_1\|_{H_K}$，则可行域非空当且仅当 $\alpha\le\Delta+\varepsilon$，frontier 为 $\{(\Delta+\varepsilon,\varepsilon):\varepsilon\ge0\}$.

**证明。** Lemma 26 与 Gaussian 参数的严格排序给出距离形式。对任意可行中心，$\|\mu-\mu_1\|_{H_K}\le\Delta+\varepsilon$. 当 $\Delta>0$ 时，取 $\mu=\nu_1+\varepsilon(\nu_1-\mu_1)/\Delta$ 达到等号；当 $\Delta=0$ 时，$H_K\ne\{0\}$ 允许选择一个单位方向并移动 $\varepsilon$. $\square$

与有限维情形相同，整个 preservation 球都可行的条件是 $\alpha\le\max\{\Delta-\varepsilon,0\}$. 若 $K=0$，则 $H_K=\{0\}$，候选族只有同一个点质量分布，只有 $\alpha=0$ 可行；这时不具有上述可以沿任意方向移动的 frontier.

## Lemma 28

对 $a,b,c,d>0$，以下条件等价：

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

这里同序指 $a\le b,c\le d$ 同时成立，或 $a\ge b,c\ge d$ 同时成立。

**证明。** 若存在 $s,r$，Proposition 5 的 thinning 与 Poisson addition 就构造出所需 kernel，因此得到曲线排序。同时，$|c-d|=s|a-b|\le|a-b|$；加上共同的非负数 $r$ 会使大数与小数之比向 $1$ 靠近，所以也得到比值条件。

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
H_t(P,Q)=\mathbb E_P\!\left[\left(\frac{dQ}{dP}\right)^t\right].
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

根据 Blackwell ordering 和 Lemma 31，$t>1$ 或 $t<0$ 时，输入实验的 $H_t$ 不小于输出实验的 $H_t$. 因而

$$
(1-t)(c-a)+t(d-b)
+a\left(\frac ba\right)^t-c\left(\frac dc\right)^t\ge0.
$$

若 $a<b,c<d$ 但 $b/a<d/c$，令 $t\to+\infty$，负的最后一项比正的指数项增长更快，也快于线性项，使左侧趋于 $-\infty$，矛盾。若 $a>b,c>d$ 但 $a/b<c/d$，令 $t\to-\infty$ 得到同样的矛盾。因此比值条件成立，证明完成。 $\square$

由这一刻画，Proposition 5 的其余 baseline 参数范围也能直接解出。下表各区间均与 $(0,\infty)$ 相交，左端点超过右端点时为空。

| Baseline 参数 | 可行均值 $\mathcal R_P$ |
|---|---|
| $\alpha>1,\ \varepsilon>1$ | $\left[\max\left\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\right\},\ \min\left\{\nu_1,\mu_1/\alpha,\mu_1+1-\alpha\right\}\right]$ |
| $\alpha>1,\ 0<\varepsilon<1$ | $\left[\nu_1,\ \min\left\{\mu_1/\alpha,\mu_1+1-\alpha,\nu_1/\varepsilon,\nu_1+1-\varepsilon\right\}\right]$ |
| $0<\alpha<1,\ \varepsilon>1$ | $\left[\max\left\{\mu_1/\alpha,\mu_1+1-\alpha,\nu_1/\varepsilon,\nu_1+1-\varepsilon\right\},\ \nu_1\right]$ |
| $0<\alpha<1,\ 0<\varepsilon<1$ | $\left[\max\left\{\mu_1/\alpha,\mu_1+1-\alpha,\nu_1\right\},\ \min\left\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\right\}\right]$ |

**推导。** 对 $\alpha>1$，removal 要求 $\mu\le\min\{\mu_1/\alpha,\mu_1+1-\alpha\}$；对 $\alpha<1$，同样解 $s_1=(\alpha-1)/(\mu_1-\mu)$，得到 $\mu\ge\max\{\mu_1/\alpha,\mu_1+1-\alpha\}$. Preservation 在 $\varepsilon>1$ 时给出

$$
\max\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\}\le\mu\le\nu_1,
$$

在 $\varepsilon<1$ 时给出

$$
\nu_1\le\mu\le\min\{\nu_1/\varepsilon,\nu_1+1-\varepsilon\}.
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

设 $Q\ll P$，$R$ 是 Markov kernel. 定义 $H_t(P,Q)=\mathbb E_P[(dQ/dP)^t]$，允许其取 $+\infty$，并在 $t=0$ 取 $H_0=1$. 则

$$
\begin{aligned}
H_t(P,Q)&\le H_t(R\circ P,R\circ Q),&&0\le t\le1,\\
H_t(P,Q)&\ge H_t(R\circ P,R\circ Q),&&t<0\text{ 或 }t>1.
\end{aligned}
$$

**证明。** 在 $X\sim P$、$Y\mid X\sim R(X,\cdot)$ 的联合分布下，令 $L(X)=dQ/dP(X)$. 对任意输出集合 $A$，

$$
(R\circ Q)(A)=\mathbb E_P[L(X)\mathbf1_{\{Y\in A\}}]
=\mathbb E_P[\mathbb E[L(X)\mid Y]\mathbf1_{\{Y\in A\}}].
$$

因此输出的 likelihood ratio 就是 $\mathbb E[L\mid Y]$. 对 $0<t<1$，$x^t$ 为凹函数，条件 Jensen 给出

$$
H_t(R\circ P,R\circ Q)
=\mathbb E\!\left[(\mathbb E[L\mid Y])^t\right]
\ge\mathbb E[L^t]=H_t(P,Q).
$$

当 $t<0$ 或 $t>1$ 时，$x^t$ 为凸函数，不等号反向；零值导致的无穷按扩展实数处理。$t=0,1$ 时两侧均为 $1$. $\square$

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

**证明。** Lemma 35 将相同 $n$ 的 Binomial 实验排序化为 Bernoulli likelihood ratio 的最小值与最大值排序。在 removal 中，输入实验是 $(B(n,p),B(n,\mu_1))$，目标实验是 baseline；代入 $a=p,b=\mu_1,c=1/2,d=\alpha$ 得到前两式。在 preservation 中交换实验的方向，代入 $a=1/2,b=\varepsilon,c=p,d=\nu_1$ 得到后两式。 $\square$

注意，原文额外要求参数对同序，这在 Binomial 情形不成立。把观察到的成功次数 $X$ 换成 $n-X$ 是可逆处理，会同时把参数 $(a,b)$ 变成 $(1-a,1-b)$，并反转其大小关系，而 trade-off function 完全不变。

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

设 $X_1,\ldots,X_n$ 独立服从 $N(\mu,\sigma^2I_d)$，$\hat\mu=n^{-1}\sum\limits_{i=1}^{n}X_i$. 则

$$
\mathbb P\!\left(\|\hat\mu-\mu\|_2>\sigma\gamma(n,d,\delta)\right)\le\delta.
$$

**证明。** $\sqrt n(\hat\mu-\mu)/\sigma$ 为标准 $d$ 维 Gaussian，因此 $n\|\hat\mu-\mu\|_2^2/\sigma^2$ 具有 $\chi_d^2$ 分布。下面推导所需的 Laurent–Massart 界。

令 $Z_1,\ldots,Z_d$ 独立服从 $N(0,1)$，并设 $S=\sum\limits_{j=1}^{d}Z_j^2-d$. 对 $0<\lambda<1/2$，Gaussian 积分给出

$$
\begin{aligned}
\log\mathbb E[e^{\lambda S}]
&=\frac d2\left(-\log(1-2\lambda)-2\lambda\right)\\
&=\frac d2\sum\limits_{k=2}^{\infty}\frac{(2\lambda)^k}{k}
\le\frac{d\lambda^2}{1-2\lambda}.
\end{aligned}
$$

对于 $t>0$，在 Chernoff bound 中取 $\lambda=\sqrt t/(\sqrt d+2\sqrt t)$，得到

$$
\begin{aligned}
\mathbb P\!\left(S\ge2\sqrt{dt}+2t\right)
&\le\exp\!\left(
-\lambda(2\sqrt{dt}+2t)+\frac{d\lambda^2}{1-2\lambda}
\right)\\
&=e^{-t}.
\end{aligned}
$$

取 $t=\log(1/\delta)$，恢复均值的尺度并开平方，即得结论。 $\square$

## Proposition 14

设 $p_1=\mu_1+X$、$q_1=\nu_1+X$，其中 $X$ 关于 $0$ 对称、具有 log-concave density. 两组样本分别含 $n_1,n_2$ 个 IID observations，且两组相互独立。从第一组独立于数据值均匀删除 $n_r$ 个，令 $n_1'=n_1-n_r\ge1$，然后用两组剩余样本的加权 empirical mean 拟合 $p=\mu+X$：

$$
\mu=\frac{n_1'\hat\mu_1'+n_2\hat\nu_1}{n_1'+n_2},\qquad
\Delta=|\mu_1-\nu_1|.
$$

设 $\gamma_X(n,1,\delta)$ 满足

$$
\mathbb P\!\left(\left|\frac1n\sum\limits_{i=1}^{n}X_i\right|>
\gamma_X(n,1,\delta)\right)\le\frac\delta2,
\qquad X_i\overset{\mathrm{IID}}\sim X.
$$

这里按论文的 $\gamma_X(n,1,2\delta)$ 对应单次失败概率 $\delta$ 的约定书写；它与前面显式定义的 Gaussian $\gamma(n,d,\delta)$ 的置信参数约定不同。

令

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

Lemma 16 的单向单调性已经足以将这两个距离界变成检验约束，因此这里不需要额外假设 $X$ 具有 full support. $\square$

这些估计量一般不是 MLE；例如 Laplace location 的 MLE 是 median. 使用 empirical mean 的原因是其误差可以直接分解为两个中心估计误差与一个残余 unwanted 权重。

论文给出的几类 noise 可以选取以下界：

| Noise $X$ | $\gamma_X(n,1,\delta)$ 的一个有效取值 |
|---|---|
| $N(0,1)$ | $n^{-1/2}\Phi^{-1}(1-\delta/4)$ |
| $\operatorname{Unif}[-a,a]$ | $a\sqrt{2\log(4/\delta)/n}$ |
| 任意支撑于 $[-a,a]$ 的对称 noise | $a\sqrt{2\log(4/\delta)/n}$ |
| density 为 $\frac12e^{-|x|}$ 的 Laplace noise | $2\sqrt{\log(4/\delta)/n}+\log(4/\delta)/n$ |

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

取 $\lambda=\sqrt t/(\sqrt n+\sqrt t)$，Chernoff bound 给出 $\mathbb P(\sum\limits_{i=1}^{n}X_i\ge2\sqrt{nt}+t)\le e^{-t}$. 利用对称性再乘 $2$，取 $t=\log(4/\delta)$，即得最后一行。 $\square$

## Remark 42 与 Remark 43 中的估计量结论

Proposition 14 的证明只用到了两个 location estimators 的误差界。因此，如果把 empirical means 替换成其它估计量，并有

$$
\mathbb P\!\left(|\hat\nu-\nu|>\gamma_\nu(n,1,\delta)\right)\le\delta/2,
$$

那么在原式中分别以 $\gamma_{\mu_1}(n_1',1,\delta)$、$\gamma_{\nu_1}(n_2,1,\delta)$ 替换两个 $\gamma_X$，同一证明仍成立。这里加权组合的是两组 location estimates；即使每一组估计量都是 MLE，它们的加权平均也未必是合并数据的 MLE.

对于 density 为 $p_\nu(x)=\frac12e^{-|x-\nu|}$ 的 Laplace location family，设 $n=2k+1$ 为奇数。MLE 是 sample median $\hat\nu=X_{(k+1)}$，其中 $X_{(1)}\le\cdots\le X_{(n)}$ 是排序样本。当 $n>2\log(4/\delta)$ 时，一个有效的估计误差界为

$$
\gamma_\nu(n,1,\delta)
=-\log\!\left(1-\sqrt{\frac2n\log\frac4\delta}\right).
$$

**证明。** Laplace 的负 log-likelihood 为常数加 $\sum\limits_{i=1}^{n}|X_i-\nu|$，其斜率在 median 左侧非正、右侧非负，故 median 最小化该目标。

令 $Z_i=X_i-\nu$、$M_n=\operatorname{med}(Z_1,\ldots,Z_n)$. 中心化样本的联合分布关于符号翻转对称，所以 $M_n$ 对称，且 $\hat\nu-\nu=M_n$. 对 $c>0$，$\mathbb P(Z_i<c)=F(c)=1-e^{-c}/2$，并令

$$
N_c=\sum\limits_{i=1}^{n}\mathbf1_{\{Z_i<c\}}\sim B(n,F(c)).
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

固定 $\delta$、令 $n\to\infty$，由 $-\log(1-x)\sim x$，median 的这个界为 $\sqrt{2\log(4/\delta)/n}$ 的量级；上述 empirical mean 界的主项为 $2\sqrt{\log(4/\delta)/n}$. 这里比较的是这两条 concentration bounds 的常数。

## Lemma 44

设 $X_1,\ldots,X_n$ IID，CDF 为 $F$，empirical CDF 为

$$
\widehat F_n(t)=\frac1n\sum\limits_{i=1}^{n}\mathbf1_{\{X_i\le t\}}.
$$

Dvoretzky–Kiefer–Wolfowitz inequality 的 sharp 形式为

$$
\mathbb P\!\left(\sup_{t\in\mathbb R}|\widehat F_n(t)-F(t)|>r\right)
\le2e^{-2nr^2},\qquad r>0.
$$

因此，采用 $d(n,\delta)=\sqrt{\log(4/\delta)/(2n)}$ 时，失败概率至多为 $\delta/2$. 原文的引理陈述漏写了绝对值；后续证明需要的是上述双侧形式。

这是一项论文直接引用的 empirical-process concentration theorem. 它同时控制所有阈值，而不是只控制一个固定 $t$，所以可以用于由数据决定的删除阈值。其 sharp 概率工具是 uniform empirical process 的双侧越界界：若 $U_i$ IID uniform on $[0,1]$，$G_n(u)=n^{-1}\sum\limits_{i=1}^{n}\mathbf1_{\{U_i\le u\}}$，则

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

在 Proposition 7 的 Gaussian 采样设定下，将 unwanted 样本按距 $\hat\nu_1$ 的距离升序排列为 $x_1^{(1:n_1)},\ldots,x_1^{(n_1:n_1)}$，并定义

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
\mathbf1_{\{\|x_1^{(i)}-\nu_1\|_2\le t\}}.
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

但这不能变成同样大小的 $\|\hat\mu_1'-\hat\nu_1\|_2$ 下界：多个方向上的位移在平均后会抵消，最大半径很大并不意味着均值离中心很远。这正是 Proposition 7 的充分界不能直接当作算法极限的原因。

## Proposition 15

在 Proposition 14 的 location-family 设定下，改为删除距 $\hat\nu_1$ 最远的 $n_r$ 个 unwanted 样本，然后仍使用 empirical means 的加权平均。定义

$$
F_X(t)=\mathbb P(|X+\mu_1-\nu_1|\le t),\qquad
F_X^{-1}(u)=\inf\{t\ge0:F_X(t)\ge u\}.
$$

假设 $1\le n_1'$ 且 $n_1'/n_1+d(n_1,\delta)<1$. 则以至少 $1-\delta$ 的概率，$0\le\alpha\le\alpha_M(S)$、$\varepsilon\ge\varepsilon_m(S)$ 保证 unlearning，其中

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

注意，距离 CDF 中使用的是 $|X+\mu_1-\nu_1|$，不是它的平方；否则分位数与 location 距离的单位不一致。

## Proposition 16

最后我们比较两种算法已证明的 preservation 上界。设 $d=1$、$\sigma=1$，$1\le n_1'<n_1$、$n_2\ge1$，$\Delta=|\mu_1-\nu_1|$，并采用 Proposition 7 中未把系数放大到 $2$ 的较紧版本：

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

这里 $F_1(t)=\mathbb P(|Z+\Delta|\le t)$、$Z\sim N(0,1)$. 定义

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

对于 $t\ge0$，标准 Gaussian 的对称性给出

$$
\begin{aligned}
F_1(t)
&=\mathbb P(-t-\Delta\le Z\le t-\Delta)\\
&=\Phi(t-\Delta)-\Phi(-t-\Delta).
\end{aligned}
$$

若 $\Delta-A<0$，分位数不等式不可能成立。若 $\Delta-A\ge0$，$F_1$ 在非负实线上严格递增，故

$$
\begin{aligned}
F_1^{-1}(q)\le\Delta-A
&\iff q\le\Phi(-A)-\Phi(A-2\Delta)\\
&\iff q\le\Phi(2\Delta-A)-\Phi(A).
\end{aligned}
$$

因为 $\Delta$ 有限，$\Phi(2\Delta-A)<1$，所以这首先要求 $q<1-\Phi(A)$. 在此条件下，应用 $\Phi^{-1}$ 得到

$$
2\Delta\ge A+\Phi^{-1}(\Phi(A)+q).
$$

由于 $q>0$，$\Phi^{-1}(\Phi(A)+q)>A$，这还自动保证 $\Delta>A$，所以前面需要的非负阈值条件没有遗漏。最后，把 $q=1-n_r/n_1+d(n_1,\delta)$ 代入第一条条件，便得到删除预算的表达式。 $\square$

当 $\delta$ 固定且 $n_1',n_2\to\infty$ 时，$A\to0$，$\Phi(A)\to1/2$；若同时 $n_1\to\infty$，删除比例条件的阈值趋于 $1/2$. 因而这组充分保证要体现 selective removal 的优势，通常需要删除约一半或更多的 unwanted 样本，并满足相应的分布间距条件。注意，这只是两条已证明上界的比较，不是 selective removal 真正优于 random removal 的必要条件。
